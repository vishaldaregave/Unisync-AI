# Taste

## Engineering values
- Rejects impressive-but-fake output: explicitly asks that mock/stubbed functionality never be presented as real, that implemented be clearly distinguished from planned, that working functionality win over flashy UI, and that a test or phase never be marked passing unless the command was actually run. Confidence: 0.7
- Wants technologies and architectural choices justified — evaluate alternatives and trade-offs rather than accepting a proposed stack (or adding any dependency) without a stated reason. Confidence: 0.55

## Workflow
- Gates implementation behind explicit review and sign-off: asks for planning/architecture work to be finished (and critically reviewed) before any application code is written, and repeats "do not start coding" / "do not generate code until X is complete". Confidence: 0.6
- Wants phase-gated, incremental delivery: small reviewable increments, a written report after each phase (files changed, migrations added, exact commands run with results, known limitations, acceptance status), and explicitly says not to rush through all phases in one pass. Confidence: 0.6
- When a requirement cannot be implemented as written, wants the blocker explained and work stopped rather than improvised around. Confidence: 0.5
