import { useState } from 'react';

interface TutorialStep {
  title: string;
  body: string;
  path?: 'war' | 'diplomacy' | 'intrigue';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Pax Imperia',
    body: 'Build an empire through War, Diplomacy, or Intrigue. Each path leads to a different victory condition. This guide will walk you through the basics.',
  },
  {
    title: 'The Map',
    body: 'Click any province to inspect it. Provinces hidden in fog-of-war appear darkened. Your faction starts with two revealed provinces.',
  },
  {
    title: 'Resources',
    body: 'Each turn you earn Gold, Food, and Manpower based on the provinces you own. Gold funds recruitment and diplomacy. Manpower replenishes troops.',
  },
  {
    title: 'War Path',
    body: 'Recruit troops via the Recruitment menu, then attack adjacent enemy provinces. Conquer 60% of all provinces to win by War.',
    path: 'war',
  },
  {
    title: 'Diplomacy Path',
    body: 'Open the Diplomacy menu to propose alliances, trade agreements, and gifts. When 3+ factions support you in an Imperial Election, you win by Diplomacy.',
    path: 'diplomacy',
  },
  {
    title: 'Intrigue Path',
    body: 'Build spy networks in enemy provinces, queue covert actions (spy, bribe, sabotage), and accumulate Shadow Influence. Control 4+ factions as puppets to win by Intrigue.',
    path: 'intrigue',
  },
  {
    title: 'End Turn',
    body: 'Click "End Turn" to advance time. Resources tick, AI factions act, random events fire, and queued intrigue actions resolve. Watch the status bar for events.',
  },
];

const PATH_COLOR: Record<string, string> = {
  war:       'text-red-400 border-red-800 bg-red-950',
  diplomacy: 'text-amber-400 border-amber-800 bg-amber-950',
  intrigue:  'text-purple-400 border-purple-800 bg-purple-950',
};

interface TutorialGuideProps {
  onDismiss: () => void;
}

export default function TutorialGuide({ onDismiss }: TutorialGuideProps) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72">
      <div className={`border rounded p-4 shadow-lg ${
        current.path
          ? PATH_COLOR[current.path]
          : 'text-stone-200 border-stone-600 bg-stone-900'
      }`}>
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs opacity-60">{step + 1} / {TUTORIAL_STEPS.length}</span>
          <button onClick={onDismiss} className="text-xs opacity-50 hover:opacity-100">Skip tutorial</button>
        </div>

        {/* Content */}
        <h4 className="font-bold text-sm mb-1">{current.title}</h4>
        <p className="text-xs opacity-80 leading-relaxed mb-3">{current.body}</p>

        {/* Progress dots */}
        <div className="flex gap-1 mb-3">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i === step ? 'bg-current opacity-80' : 'bg-current opacity-20'}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-1 text-xs border border-current rounded opacity-60 hover:opacity-100"
            >
              Back
            </button>
          )}
          <button
            onClick={isLast ? onDismiss : () => setStep((s) => s + 1)}
            className="flex-1 py-1 text-xs border border-current rounded font-bold hover:opacity-80"
          >
            {isLast ? 'Got it!' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
