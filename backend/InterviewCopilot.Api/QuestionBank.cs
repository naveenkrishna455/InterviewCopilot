namespace InterviewCopilot.Api;

public static class QuestionBank
{
    private static readonly string[] SharedQuestions =
    [
        "Tell me about a project or accomplishment you’re especially proud of. What made it meaningful to you?",
        "Tell me about a time you had to solve a problem with incomplete information. How did you approach it?",
        "Describe a time you received feedback that changed how you work.",
        "How do you decide what to prioritize when several things need your attention?",
        "What kind of team and work environment helps you do your best work?"
    ];

    private static readonly Dictionary<string, string[]> RoleQuestions = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Product Designer"] =
        [
            "Walk me through a design decision you made that improved the experience for users.",
            "How do you balance user needs, business goals, and technical constraints?",
            "Tell me about a time research changed your initial design direction.",
            "How do you work through disagreement with a product manager or engineer?",
            "What does a successful design handoff look like to you?"
        ],
        ["Frontend Engineer"] =
        [
            "Tell me about a frontend feature you shipped from idea to production. What tradeoffs did you make?",
            "How do you approach improving the performance of a page that feels slow?",
            "Describe a challenging UI bug you investigated and how you found its root cause.",
            "How do you keep a component system accessible and maintainable as it grows?",
            "How do you collaborate with design when an interaction is difficult to implement?"
        ],
        ["Product Manager"] =
        [
            "Tell me about a product decision you made using customer feedback or data.",
            "How do you decide what not to build when a roadmap is full of good ideas?",
            "Describe a time you aligned stakeholders around a difficult tradeoff.",
            "How do you measure whether a launched feature is successful?",
            "Tell me about a product assumption that turned out to be wrong."
        ],
        ["Data Analyst"] =
        [
            "Tell me about an analysis that changed a team's decision.",
            "How do you validate that a dataset is reliable before drawing conclusions?",
            "Describe how you explained a complex finding to a non-technical audience.",
            "How do you distinguish a meaningful trend from noise?",
            "Tell me about a time your analysis uncovered an unexpected result."
        ],
        ["Software Engineer"] =
        [
            "Tell me about a technical decision you made and the tradeoffs you considered.",
            "How do you approach debugging an issue that you cannot reproduce locally?",
            "Describe a time you improved the reliability or maintainability of a system.",
            "How do you decide when to refactor and when to ship?",
            "Tell me about a technical disagreement and how you resolved it."
        ],
        ["UX Researcher"] =
        [
            "Tell me about a research project that influenced a product direction.",
            "How do you choose a research method when timelines are tight?",
            "Describe a time participant feedback challenged your assumptions.",
            "How do you make research findings useful to teams that were not in the sessions?",
            "How do you balance qualitative insights with quantitative evidence?"
        ]
    };

    public static IReadOnlyList<InterviewQuestion> ForRole(string role)
    {
        var prompts = RoleQuestions.TryGetValue(role, out var rolePrompts)
            ? rolePrompts
            : SharedQuestions;

        return prompts
            .Select((prompt, index) => new InterviewQuestion(
                $"q{index + 1}",
                prompt,
                index is 0 or 4 ? "Getting to know you" : "Experience & approach"))
            .ToArray();
    }

    public static bool IsSupportedRole(string role) => RoleQuestions.ContainsKey(role);
}
