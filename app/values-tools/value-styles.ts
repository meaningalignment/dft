export interface ValueStyle {
  instructionsLeadIn: string;
  evaluationCriteriaIntroString: string;
}

export const dftStyle: ValueStyle = {
  instructionsLeadIn: "ChatGPT should look for",
  evaluationCriteriaIntroString: "ChatGPT will be considered successful if, in dialogue with the user, the following kinds of things were surfaced or enabled:",
}
