## ADDED Requirements

### Requirement: Talk back to Kai
In O10–O10f, text the user types (not a tapped option) SHALL be shown as the user's bubble and sent to the server's Kai reply. If it answers the current step, the chat goes on as if that answer was given (a name, a chat language, a topic, practice / words first). If not, Kai types the answer's lines and then asks the current step's question again with the same options: name "So, what’s your name? 😊"; chat language "Which language should we chat in?"; topic "So, what do you want to learn? 🌮"; proposed "Tap **Generate** when you’re ready ✨"; generating "Your words are almost ready ⏳"; ready "Shall we practice them now? 💪". If the Kai reply fails, the typed text is taken as the answer, as before (in `proposed` and `generating` it is ignored).

#### Scenario: Off the script
- **WHEN** Kai asked for the name and the user types "What is this app?"
- **THEN** Kai types a short answer, then "So, what’s your name? 😊", and the next typed name is taken

#### Scenario: Name in a sentence
- **WHEN** the user types "I'm Maya"
- **THEN** Kai says "Nice to meet you, **Maya**! 😊"

#### Scenario: Kai cannot answer
- **WHEN** the Kai reply fails and the user typed "Maya"
- **THEN** the chat goes on with the name "Maya"
