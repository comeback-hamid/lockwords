package com.comebackhamid.lockwords.widget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// What the app can do with the widget. The app calls `setEntries` when it starts, when it comes back to the front
// and after a review round (src/widgets/sync.android.ts).
class LockwordsWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LockwordsWidget")

    // The plan as a JSON list of entries (see Entry). The widget keeps it and draws itself again.
    Function("setEntries") { json: String ->
      val context = appContext.reactContext ?: return@Function
      WidgetStore.save(context, json)
      HardWordsWidget.refreshAll(context)
    }

    // What the widget shows right now, as JSON ({ word, meaning, look, url, kind }). For checks: a test cannot read a
    // widget on the home screen.
    Function("shown") {
      val context = appContext.reactContext ?: return@Function null
      val e = WidgetPlan.current(WidgetPlan.parse(WidgetStore.load(context)), System.currentTimeMillis())
      org.json.JSONObject().put("kind", e.kind).put("word", e.word).put("meaning", e.meaning).put("look", e.look).put("url", e.url).toString()
    }

    // How many Lockwords widgets are on the home screen.
    Function("count") {
      val context = appContext.reactContext ?: return@Function 0
      HardWordsWidget.ids(context).size
    }
  }
}
