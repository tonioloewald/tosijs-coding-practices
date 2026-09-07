# Below ground — what a 40-year problem teaches about working with AI

*2026-09-07. Owner reflection, recorded with its consequences; companion to
`~/ariosto/writing-room.md`.*

Ariosto is proving interesting in a second way: it is changing how the owner thinks about
AI. The design problem it attacks has been under attack by him for over forty years — begun
before he was a professional developer, viewed from many angles, resistant while many
"hard" problems in the same domain fell quickly. What working on it with AI has surfaced:

> Sometimes I need to break my own knowledge down **below the abstraction layer I think of
> as its "ground"** — when the skillset involved is not part of the corpus available to
> train AIs.

Expertise has a floor: the level beneath which a practitioner never articulates, because
intuition handles it. Prompting transmits fluently *above* that floor — but only where the
model shares it. In well-corpused domains (software), it does, which is why hard problems
fall fast. In a domain whose public record is forty years of failed attempts, the model's
prior IS the failure corpus: prompt at your normal level and it silently back-fills with
competent mediocrity — which is exactly what the murder-experiment transcripts were. Not
errors. Corpus-average.

Three consequences:

1. **The resistance and the corpus absence are the same fact.** If the sub-ground
   decomposition existed anywhere public, the problem would have yielded and the corpus
   would teach it. The domain that most needs decomposition is the one where only you can
   supply it.
2. **The model is an instrument for the decomposition.** Its failures map where tacit
   knowledge lives: each failed experiment converted one intuition into an explicit
   requirement (answers must come from character; not-knowing cannot be performed; scenes
   must be played, not summarized). Forty years of thinking didn't force those
   articulations; a week of model failures forced three.
3. **For corpus-absent skills, only mechanism transmits.** The writing-room architecture is
   the decomposition made executable — ledger, perception rules, scoped knowledge,
   cold-detective screening. "You can't prompt not-knowing; you build not-knowing" is the
   general form, and it is the transmission lesson (prompts don't transmit what questions
   and structure do) taken to its limit.

**The owner's analogy:** teaching a small child to "just pick up the ball and bring it to
me" — what you experience as one fundamental skill turns out to be twenty motor and
conceptual skills you take for granted and never think about. The ground floor is
learner-relative: competence is precisely what makes the decomposition invisible, and you
discover the real granularity only when a learner fails at a grain you didn't know
existed.

With one crucial difference from the child, which is why model failures disorient: the
skill layers that co-develop in humans **don't co-occur in models**. The model has
superb fine motor control (fluent prose) while missing what you'd swear is a more basic
layer (knowing what a character doesn't know) — so the capability profile is *jagged*, and
"it writes beautifully, why can't it do X?" is the wrong question. The layers were never a
stack; they only felt like one because in humans they arrive together.

**Corpora are path-dependent, and the dependence runs backwards from intuition.** The
lived path that produces a StackOverflow-competent person is full of formative experience —
the mental process of creating a D&D character, playing at a table — that the written
conversation *assumes* ("you know all the things") and never contains, because at the time
it was absorbed by osmosis and wasn't thought worth writing down. A corpus records what a
culture *bothered to write*, and cultures write down what osmosis **couldn't** deliver:
StackOverflow exists precisely because programming's community of practice went remote and
asynchronous, so text had to replace the shoulder-look. Co-present practices — tabletop
play above all — never needed text, so they never produced it. The inversion: **a model is
weakest not in a culture's rarest knowledge but in its most universally shared** — the
water the fish never wrote about. (Actual-play recordings don't close the gap: they are
transcripts of the *performance*, not decompositions of the *process* — the output again.)

This gives the missing-prior diagnosis an ex-ante test: before assuming a skill is in the
corpus, ask **"was this learned co-presently, by osmosis?"** If yes, expect silent
back-fill and go straight to mechanism.

Operational form for agents: `model-priors.md` "The missing prior."
