import { useState } from 'react';
import { api } from '../api';

const CONSOLE_LABELS = { playstation: 'PlayStation', xbox: 'Xbox', nintendo: 'Nintendo', 'pc-gaming': 'PC Gaming', retro: 'Retro' };

const SYMPTOMS = [
    'No power / won\'t turn on', 'Red/blinking light of death', 'Disc read errors',
    'Overheating / loud fan', 'Controller not connecting', 'HDMI / no video output',
    'Freezing / crashing', 'Slow performance', 'Network / Wi-Fi issues',
    'Stick drift', 'Battery not charging', 'Other',
];

export default function RepairWizard({ console: consoleKey, onNavigate }) {
    const [step, setStep] = useState(1);
    const [symptoms, setSymptoms] = useState([]);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [submitted, setSubmitted] = useState(false);

    function toggleSymptom(s) {
        setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    }

    async function analyze() {
        setLoading(true);
        try {
            const fullDesc = `Console: ${CONSOLE_LABELS[consoleKey]}. Symptoms: ${symptoms.join(', ')}. Details: ${description}`;
            const data = await api.analyzeRepair({
                consoleCategory: consoleKey,
                description: fullDesc,
            });
            setResult(data);
            setStep(3);
        } catch {
            setResult({ severity: 'unknown', aiDiagnosis: 'Unable to analyze. Please try again or submit directly.', estimatedCost: { min: 0, max: 0 }, estimatedTime: 'Unknown', recommendation: 'Submit for manual review.' });
            setStep(3);
        }
        setLoading(false);
    }

    async function submit() {
        if (!result?._id) return;
        try {
            await api.submitRepair(result._id);
            setSubmitted(true);
            setStep(4);
        } catch { }
    }

    const severityColors = { low: 'text-green-400 bg-green-400/10', medium: 'text-yellow-400 bg-yellow-400/10', high: 'text-red-400 bg-red-400/10' };

    return (
        <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-white/5 shrink-0">
                <h2 className="text-white font-heading font-bold text-lg">🔧 Repair Wizard — {CONSOLE_LABELS[consoleKey]}</h2>
                <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className={`h-1 flex-1 rounded-full transition ${step >= s ? 'bg-accent' : 'bg-white/10'}`} />
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6">
                {/* Step 1: Symptoms */}
                {step === 1 && (
                    <div className="max-w-lg mx-auto space-y-4 animate-fadeSlide">
                        <h3 className="text-white font-heading font-semibold">What symptoms are you experiencing?</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {SYMPTOMS.map(s => (
                                <button key={s} onClick={() => toggleSymptom(s)}
                                    className={`text-left px-3 py-2.5 rounded-lg text-sm border transition ${symptoms.includes(s)
                                        ? 'border-accent bg-accent/10 text-white' : 'border-white/5 bg-surface text-gray-400 hover:text-white hover:border-white/10'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setStep(2)} disabled={symptoms.length === 0}
                            className="bg-accent hover:bg-accent/80 text-white font-medium px-6 py-2 rounded-lg transition disabled:opacity-30">
                            Next →
                        </button>
                    </div>
                )}

                {/* Step 2: Description */}
                {step === 2 && (
                    <div className="max-w-lg mx-auto space-y-4 animate-fadeSlide">
                        <h3 className="text-white font-heading font-semibold">Describe the issue in detail</h3>
                        <p className="text-gray-500 text-sm">When did it start? What were you doing? Any error codes?</p>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5}
                            className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-accent transition resize-none"
                            placeholder="Describe what happened..." />
                        <div className="flex gap-3">
                            <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white text-sm transition">← Back</button>
                            <button onClick={analyze} disabled={loading}
                                className="bg-accent hover:bg-accent/80 text-white font-medium px-6 py-2 rounded-lg transition disabled:opacity-50">
                                {loading ? 'Analyzing...' : '🔍 Analyze'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Results */}
                {step === 3 && result && (
                    <div className="max-w-lg mx-auto space-y-4 animate-fadeSlide">
                        <h3 className="text-white font-heading font-semibold">Diagnosis Results</h3>
                        <div className="bg-surface rounded-xl border border-white/5 p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${severityColors[result.severity] || 'text-gray-400 bg-white/5'}`}>
                                    {result.severity} severity
                                </span>
                            </div>
                            <div>
                                <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-1">AI Diagnosis</h4>
                                <p className="text-gray-200 text-sm whitespace-pre-wrap">{result.aiDiagnosis}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-deep rounded-lg p-3">
                                    <p className="text-gray-500 text-xs">Estimated Cost</p>
                                    <p className="text-white font-semibold">
                                        {result.estimatedCost?.min != null ? `$${result.estimatedCost.min} – $${result.estimatedCost.max}` : 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-deep rounded-lg p-3">
                                    <p className="text-gray-500 text-xs">Estimated Time</p>
                                    <p className="text-white font-semibold">{result.estimatedTime || 'N/A'}</p>
                                </div>
                            </div>
                            {result.recommendation && (
                                <div>
                                    <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-1">Recommendation</h4>
                                    <p className="text-accent text-sm">{result.recommendation}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setStep(1); setResult(null); }}
                                className="text-gray-400 hover:text-white text-sm transition">Start Over</button>
                            {result._id && (
                                <button onClick={submit}
                                    className="bg-accent hover:bg-accent/80 text-white font-medium px-6 py-2 rounded-lg transition">
                                    📋 Submit Repair Request
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 4: Submitted */}
                {step === 4 && (
                    <div className="max-w-lg mx-auto text-center space-y-4 animate-fadeSlide py-12">
                        <div className="text-5xl">✅</div>
                        <h3 className="text-white font-heading font-bold text-xl">Repair Request Submitted</h3>
                        <p className="text-gray-400">A technician will review your request. You'll be notified when it's accepted.</p>
                        <button onClick={() => { setStep(1); setResult(null); setSymptoms([]); setDescription(''); setSubmitted(false); }}
                            className="text-accent hover:underline text-sm">Submit another request</button>
                    </div>
                )}
            </div>
        </div>
    );
}
