# paywall/mobile Specification

## Purpose
The trial reminder and the paywall screens. Purchases are not connected yet.

## Requirements

### Requirement: Trial reminder
The screen SHALL show "We’ll remind you before your trial ends", three rows (TODAY · Full access, free / DAY 5 · We email you a reminder / DAY 7 · Trial ends. Cancel in 2 taps), "No charge today." and a Continue button that opens the paywall.

#### Scenario: Continue
- **WHEN** the user taps Continue
- **THEN** the paywall shows

### Requirement: Paywall
The paywall SHALL show Kai, "LOCKWORDS PRO", "Keep your words growing", four features, two plans (Yearly: "7 days free, then $39.99 a year", "$3.33/mo", "SAVE 52%", selected at first; Monthly: "7 days free, then $6.99 a month", "$6.99/mo"), the button "Start 7-day free trial" and a close button. It is soft: closing it, or tapping the trial button while purchases are not connected, opens the app on the free plan. The one-time screens are then marked as seen.

#### Scenario: Close
- **WHEN** the user taps Close
- **THEN** the tabs show and the one-time screens never show again

#### Scenario: Pick a plan
- **WHEN** the user taps Monthly
- **THEN** Monthly is selected and Yearly is not
