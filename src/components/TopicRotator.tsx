import React, { useState, useEffect, useCallback } from 'react';
import './TopicRotator.css';

interface Topic {
    title: string;
    questions: string[];
}

interface TopicRotatorProps {
    onQuestionClick?: (question: string) => void;
}

const TOPICS: Topic[] = [
    {
        title: "Standard Operating Procedures",
        questions: [
            "Where can I find the SOPs for daily opening and closing?",
            "What’s the step‑by‑step process to handle a safe count discrepancy?",
            "How do I process a void or refund according to SOP?",
            "What is the escalation path in the SOP if a tool or system is down (POS, kiosks, cameras)?",
            "Show me the SOP for merchandising firearms vs. non‑firearms items.",
            "What are the SOPs for receiving, tagging, and storing high‑value items (e.g., luxury goods, electronics)?",
            "Which SOP covers end‑of‑day cash reconciliation and deposit verification?",
            "Who approves exceptions to SOP and how do I document them?"
        ]
    },
    {
        title: "Code of Conduct",
        questions: [
            "Where is the latest Code of Conduct and who does it apply to?",
            "How do I report a concern or potential violation confidentially?",
            "Can I accept a customer gift? What are the thresholds and approvals?",
            "What is our policy on conflicts of interest (outside employment, family, vendors)?",
            "What are social media do’s and don’ts for Team Members?",
            "How do I handle interactions that may appear discriminatory or harassing?",
            "Where do I record required annual Code/ethics training completion?",
            "What happens after I submit an ethics concern—who investigates and how am I informed?"
        ]
    },
    {
        title: "Compliance",
        questions: [
            "What triggers enhanced due diligence under our AML policy?",
            "How do I perform required sanctions (OFAC) screening and document the result?",
            "When do I file (or escalate for) a suspicious activity report (SAR) and what details are required?",
            "What are our data privacy rules for handling customer PII in store?",
            "How long must I retain transaction records and where are the retention rules documented?",
            "What are the required annual trainings for compliance and how do I check my status?",
            "How do I respond if a law enforcement agency requests records from our store?",
            "Who is the contact (role/alias) for compliance questions and exception approvals?"
        ]
    },
    {
        title: "Firearms",
        questions: [
            "What licenses and prerequisites must a store have to transact in firearms?",
            "What are the steps to complete Form 4473 in our kiosk/tablet workflow?",
            "How do I proceed if the background check response is Delayed or No Response by the permitted date?",
            "What firearm types/items we do not transact in (e.g., NFA items) and how do I identify them?",
            "Where do I log acquisitions and dispositions (A&D/Bound Book), and what details are mandatory?",
            "What’s the process if a firearm fails a safety check or is suspected to be stolen?",
            "Who can authorize a manual 4473 in exceptional circumstances and how do I document that?",
            "What are merchandising, storage, and security standards for firearms on the sales floor and in the backroom?"
        ]
    },
    {
        title: "Pawn Loans Outstanding",
        questions: [
            "What is PLO and how is it calculated in our reporting?",
            "Show me my store’s current PLO and the week‑over‑week trend.",
            "Which actions have the biggest impact on reducing aged PLO?",
            "How do buybacks, renewals, and redemptions affect PLO today vs. month‑end?",
            "What reports should I review daily to manage PLO risk?",
            "How do I reconcile discrepancies between POS and dashboard PLO figures?",
            "What is our policy for contacting customers on loans approaching default?",
            "Which MAP (Master Action Plan) items should I align to improve PLO this week?"
        ]
    },
    {
        title: "Sales",
        questions: [
            "What are our core sales KPIs and current goals (attachment rate, conversion, ASP, etc.)?",
            "How do I process layaway and what is the minimum down payment?",
            "What’s today’s promotion and how do I apply it in POS?",
            "When do I need manager approval for a price override or discount?",
            "What are the required steps for appraising and pricing a high‑value item?",
            "How do I handle a customer price match or competitive quote?",
            "What’s the correct process to add warranties or accessories (attachment best practices)?",
            "Show me my team’s leaderboard for sales KPIs this week."
        ]
    },
    {
        title: "Customer Engagement",
        questions: [
            "What are our standards for greeting, discovery questions, and closing?",
            "How do I recover a negative experience and request updated feedback/NPS?",
            "What should I do with a customer complaint (in‑store vs. external sites like BBB/Google)?",
            "What is the approved script for calling customers on layaway or upcoming due dates?",
            "How do I document customer preferences or communication opt‑ins correctly?",
            "What’s the process to use an interpreter or language line for non‑English speakers?",
            "How should I handle accessibility requests or service animals?",
            "Where can I see VOC trends for my store and top drivers to address?"
        ]
    },
    {
        title: "Team Member Engagement",
        questions: [
            "How do I prepare for and document effective 1:1s and coaching sessions?",
            "What recognition programs do we have (e.g., kudos, spot awards) and how do I submit one?",
            "How can I request shift swaps or scheduling changes per policy?",
            "What’s the process to escalate interpersonal conflicts or harassment concerns?",
            "Where do I access pulse survey results and plan improvements with my team?",
            "What learning paths are recommended for new vs. experienced Team Members?",
            "How do I track training completion and assign refresher modules?",
            "What resources support mental health and well‑being for Team Members?"
        ]
    },
    {
        title: "Master Action Plans",
        questions: [
            "What is a Master Action Plan and how does it connect to store KPIs?",
            "How do I add, assign, and prioritize MAP tasks for the week?",
            "Which MAP actions are recommended to tackle aged PLO or shrink this month?",
            "How do I update status, due dates, and evidence for a MAP item?",
            "What’s the review cadence for MAPs and who must sign off?",
            "How do I link MAP tasks to audit findings or compliance gaps?",
            "Can the MAP pull data from dashboards automatically for goal tracking?",
            "How do I export or share the MAP for my district check‑in?"
        ]
    },
    {
        title: "Critical Thinking",
        questions: [
            "You have two customers waiting, a 4473 in progress with a Delayed response, and a safe count variance—what do you do first and why?",
            "A customer tries to redeem a loan with mismatched ID information—how do you verify and proceed?",
            "Dashboard shows PLO increasing while traffic is down—what hypotheses do you test and what actions follow?",
            "Audit found incomplete records on three firearm acquisitions—outline your immediate containment and long‑term prevention plan?",
            "A negative review mentions price inconsistency—how do you investigate and correct the root cause?",
            "Team engagement scores dipped on “coaching quality”—what evidence do you gather and what changes do you try first?",
            "A high‑value item’s appraisal is contested by the customer—what objective steps and references do you use?",
            "A promo is driving volume but lowering margin—how do you decide whether to continue, adjust, or end it?"
        ]
    }
];

// Helper to get random items from array
const getRandomItems = <T,>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

type AnimationPhase = 'hidden' | 'topic-in' | 'questions-in' | 'display' | 'questions-out' | 'topic-out';

export const TopicRotator: React.FC<TopicRotatorProps> = ({ onQuestionClick }) => {
    const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
    const [currentQuestions, setCurrentQuestions] = useState<string[]>([]);
    const [phase, setPhase] = useState<AnimationPhase>('hidden');

    const pickNewTopic = useCallback(() => {
        const randomTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
        const randomQs = getRandomItems(randomTopic.questions, 3);
        setCurrentTopic(randomTopic);
        setCurrentQuestions(randomQs);
    }, []);

    useEffect(() => {
        // Initial start
        pickNewTopic();

        let timeoutId: NodeJS.Timeout;

        const runSequence = () => {
            // 1. Topic Fly In
            setPhase('topic-in');

            timeoutId = setTimeout(() => {
                // 2. Questions Fade In
                setPhase('questions-in');

                timeoutId = setTimeout(() => {
                    // 3. Display
                    setPhase('display');

                    timeoutId = setTimeout(() => {
                        // 4. Questions Fade Out (after 25s)
                        setPhase('questions-out');

                        timeoutId = setTimeout(() => {
                            // 5. Topic Fly Out
                            setPhase('topic-out');

                            timeoutId = setTimeout(() => {
                                // 6. Reset / Pick New (while hidden)
                                setPhase('hidden');
                                pickNewTopic();

                                // Short buffer then restart
                                timeoutId = setTimeout(() => {
                                    runSequence();
                                }, 100);

                            }, 600); // Wait for topic fly out
                        }, 800); // Wait for questions fade out
                    }, 25000); // Display time
                }, 800); // Wait for questions fade in
            }, 600); // Wait for topic fly in
        };

        // Start delay
        const startTimeout = setTimeout(runSequence, 100);

        return () => {
            clearTimeout(startTimeout);
            clearTimeout(timeoutId);
        };
    }, [pickNewTopic]);

    if (!currentTopic) return null;

    return (
        <div className="topic-rotator-container">
            {/* Topic Section Header - Static */}
            <div className="section-header">
                ~DISCUSSION TOPICS~
            </div>

            <div className={`topic-pill ${phase === 'topic-in' || phase === 'questions-in' || phase === 'display' || phase === 'questions-out'
                ? 'fly-in'
                : phase === 'topic-out'
                    ? 'fly-out'
                    : 'hidden'
                }`}>
                {currentTopic.title}
            </div>

            {/* Questions Section Header - Static */}
            <div className="section-header">
                ~EXAMPLE QUESTIONS~
            </div>

            <div className={`questions-list ${phase === 'questions-in' || phase === 'display'
                ? 'fade-in'
                : 'fade-out'
                }`}>
                <ul>
                    {currentQuestions.map((q, idx) => (
                        <li
                            key={idx}
                            onClick={() => onQuestionClick?.(q)}
                            className="clickable-question"
                        >
                            {q}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
