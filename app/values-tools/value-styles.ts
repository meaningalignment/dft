export interface ValueStyle {
  instructionsLeadIn: string;
  evaluationCriteriaIntroString: string;
}

export const dftStyle: ValueStyle = {
  instructionsLeadIn: "ChatGPT should look for",
  evaluationCriteriaIntroString: "ChatGPT will be considered successful if, in dialogue with the user, the following kinds of things were surfaced or enabled:",
}

export const personalStyle: ValueStyle = {
  instructionsLeadIn: "I attend to",
  evaluationCriteriaIntroString: "I am following this source of meaning when I attend to and choose by the following:",
}
