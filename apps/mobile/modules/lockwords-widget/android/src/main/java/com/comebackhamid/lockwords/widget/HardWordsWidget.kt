package com.comebackhamid.lockwords.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.StyleSpan
import android.view.View
import android.widget.RemoteViews

// The plan the app handed over, kept on the phone so the widget can draw without the app.
object WidgetStore {
  private const val FILE = "lockwords_widget"
  private const val KEY = "entries"
  fun save(context: Context, json: String) = context.getSharedPreferences(FILE, Context.MODE_PRIVATE).edit().putString(KEY, json).apply()
  fun load(context: Context): String? = context.getSharedPreferences(FILE, Context.MODE_PRIVATE).getString(KEY, null)
}

// The Lockwords home screen widget (Figma page "Widgets", Home Screen frames): hard words only.
// One word per 30-minute slot, 5 looks per word; the server made that plan and the app handed it over.
// The widget cannot ask the server. It draws the entry for "now" and wakes itself at the start of the next one.
class HardWordsWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    draw(context, manager, ids)
  }

  // The learner made the widget wider or narrower: the other layout may fit now.
  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) {
    draw(context, manager, intArrayOf(id))
  }

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == ACTION_NEXT) refreshAll(context) else super.onReceive(context, intent)
  }

  // The last widget left the home screen: no more wake-ups.
  override fun onDisabled(context: Context) {
    (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(wakeUp(context))
  }

  companion object {
    private const val ACTION_NEXT = "com.comebackhamid.lockwords.widget.NEXT"
    private const val MEDIUM_FROM_DP = 220 // from this width the medium layout fits (the example sentence, a bigger Kai)
    private const val WAKE_WINDOW_MS = 2 * 60 * 1000L // Android may be this late; an exact alarm would need a permission

    // Kai cannot move in a widget, so it gets a new still pose with every look: waves, rests, thinks, speaks, cheers
    // (the same order as on iOS: src/widgets/timeline.ts, poseOf).
    private val POSES = intArrayOf(R.drawable.lw_kai_greeting, R.drawable.lw_kai_idle, R.drawable.lw_kai_thinking, R.drawable.lw_kai_speaking, R.drawable.lw_kai_celebrate)
    private val SQUARES = intArrayOf(R.id.lw_sq1, R.id.lw_sq2, R.id.lw_sq3, R.id.lw_sq4, R.id.lw_sq5)
    private val FILLED = intArrayOf(R.drawable.lw_square_1, R.drawable.lw_square_2, R.drawable.lw_square_3, R.drawable.lw_square_4, R.drawable.lw_square_5)

    fun ids(context: Context): IntArray =
      AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, HardWordsWidget::class.java))

    // Draws every Lockwords widget again. Called by the app (a new plan) and by the wake-up (the next slot).
    fun refreshAll(context: Context) {
      val ids = ids(context)
      if (ids.isNotEmpty()) draw(context, AppWidgetManager.getInstance(context), ids)
    }

    private fun draw(context: Context, manager: AppWidgetManager, ids: IntArray) {
      val now = System.currentTimeMillis()
      val entries = WidgetPlan.parse(WidgetStore.load(context))
      val entry = WidgetPlan.current(entries, now)
      for (id in ids) {
        val width = manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        manager.updateAppWidget(id, views(context, entry, width >= MEDIUM_FROM_DP, id))
      }
      // The system also wakes the widget every 30 minutes (res/xml/lw_widget_info.xml), but not on the half hour.
      // So the widget asks to be woken at the start of the next entry.
      WidgetPlan.nextChange(entries, now)?.let { at ->
        (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).setWindow(AlarmManager.RTC, at, WAKE_WINDOW_MS, wakeUp(context))
      }
    }

    private fun wakeUp(context: Context): PendingIntent =
      PendingIntent.getBroadcast(context, 0, Intent(context, HardWordsWidget::class.java).setAction(ACTION_NEXT), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    private fun views(context: Context, entry: Entry, medium: Boolean, id: Int): RemoteViews {
      val isWord = entry.kind == "word"
      val v = RemoteViews(context.packageName, if (medium) R.layout.lw_widget_medium else R.layout.lw_widget_small)
      // The label: HARD WORD for a word, LOCKWORDS else (two views, so each keeps its theme color in light and dark).
      v.setViewVisibility(R.id.lw_label, if (isWord) View.VISIBLE else View.GONE)
      v.setViewVisibility(R.id.lw_label_brand, if (isWord) View.GONE else View.VISIBLE)
      v.setTextViewText(R.id.lw_word, entry.word)
      v.setTextViewText(R.id.lw_meaning, entry.meaning)
      if (medium) {
        v.setTextViewText(R.id.lw_example, bold(entry.example))
        v.setViewVisibility(R.id.lw_example, if (entry.example.isEmpty()) View.GONE else View.VISIBLE)
      }
      // Five squares: one filled per look, each in its own green.
      v.setViewVisibility(R.id.lw_squares, if (entry.look > 0) View.VISIBLE else View.GONE)
      SQUARES.forEachIndexed { i, square -> v.setImageViewResource(square, if (i < entry.look) FILLED[i] else R.drawable.lw_square_empty) }
      v.setImageViewResource(R.id.lw_kai, POSES.getOrElse(entry.look - 1) { R.drawable.lw_kai_idle })
      // A tap opens the app on this word (the same address as the iOS widget).
      val open = Intent(Intent.ACTION_VIEW, Uri.parse(entry.url)).setPackage(context.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      v.setOnClickPendingIntent(R.id.lw_root, PendingIntent.getActivity(context, id, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
      return v
    }

    // "Quiero **la cuenta**" → the marked word in bold, the marks taken out.
    private fun bold(text: String): CharSequence {
      val out = SpannableStringBuilder()
      text.split("**").forEachIndexed { i, part ->
        val from = out.length
        out.append(part)
        if (i % 2 == 1) out.setSpan(StyleSpan(Typeface.BOLD), from, out.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
      }
      return out
    }
  }
}
