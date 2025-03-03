export const arduinoLanguageConfig = {
  keywords: [
    "setup",
    "loop",
    "pinMode",
    "digitalWrite",
    "digitalRead",
    "analogWrite",
    "analogRead",
    "delay",
    "delayMicroseconds",
    "HIGH",
    "LOW",
    "INPUT",
    "OUTPUT",
    "INPUT_PULLUP",
  ],
  functions: [
    {
      label: "pinMode",
      kind: "Function",
      insertText: "pinMode(${1:pin}, ${2:mode})",
      insertTextRules: 4,
      documentation:
        "Configures the specified pin to behave either as an input or an output",
    },
    {
      label: "digitalWrite",
      kind: "Function",
      insertText: "digitalWrite(${1:pin}, ${2:value})",
      insertTextRules: 4,
      documentation: "Write a HIGH or LOW value to a digital pin",
    },
    {
      label: "delay",
      kind: "Function",
      insertText: "delay(${1:ms})",
      insertTextRules: 4,
      documentation:
        "Pauses the program for the amount of time (in milliseconds)",
    },
  ],
};
