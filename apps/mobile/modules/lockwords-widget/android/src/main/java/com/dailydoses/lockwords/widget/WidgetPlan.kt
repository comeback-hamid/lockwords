package com.dailydoses.lockwords.widget

import org.json.JSONArray

// One thing the widget can show, from a time on. The app makes the list from the server's plan
// (src/widgets/sync.android.ts): the server decided the words, the order and the looks. Nothing is sorted or counted here.
data class Entry(
  val at: Long, // milliseconds since 1970: shown from this moment
  val kind: String, // "word" · "empty" (no hard words) · "stale" (the plan ran out)
  val word: String,
  val meaning: String,
  val look: Int, // 1 to 5 for a word, 0 for the other kinds
  val url: String, // where a tap goes
  val example: String // the example sentence, the word marked **like this**; "" = none
)

object WidgetPlan {
  // What the widget shows before the app has handed over a plan (a new install, or signed out).
  val NONE = Entry(0, "stale", "Open Lockwords", "for your hard words", 0, "lockwords://review", "")

  fun parse(json: String?): List<Entry> {
    if (json.isNullOrBlank()) return emptyList()
    return try {
      val list = JSONArray(json)
      (0 until list.length()).map { i ->
        val o = list.getJSONObject(i)
        Entry(
          at = o.getLong("at"),
          kind = o.optString("kind", "word"),
          word = o.optString("word"),
          meaning = o.optString("meaning"),
          look = o.optInt("look", 0),
          url = o.optString("url", NONE.url),
          example = o.optString("example")
        )
      }
    } catch (e: Exception) {
      emptyList() // a broken list counts as no list
    }
  }

  // The entry for this moment: the newest one that has started. Before the first one (at night no slot runs) the
  // first word shows already, so the widget is never blank.
  fun current(entries: List<Entry>, now: Long): Entry =
    entries.lastOrNull { it.at <= now } ?: entries.firstOrNull() ?: NONE

  // When the widget must be drawn again: the start of the next entry. Null = nothing more is planned.
  fun nextChange(entries: List<Entry>, now: Long): Long? = entries.firstOrNull { it.at > now }?.at
}
