"use client";

import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Volume2, Search, Sparkles, Star } from 'lucide-react';

export interface VocabItem {
  id: number;
  word: string;
  pos: string; // Part of speech, e.g. (verb), (noun), (adj)
  hindiMeaning: string;
  meaning: string;
  synonyms: string[];
  antonyms: string[];
  usage: string;
}

export const VOCAB_DATA: VocabItem[] = [
  {
    id: 1,
    word: "SCEPTICAL",
    pos: "(adj)",
    hindiMeaning: "संदेहवादी / शक्की",
    meaning: "having or expressing doubt; not easily convinced; questioning the truth or validity of something.",
    synonyms: ["dubious", "incredulous", "cynical", "distrustful"],
    antonyms: ["certain", "convinced", "credulous", "trusting"],
    usage: "The public remains sceptical about the government's promises regarding tax cuts."
  },
  {
    id: 2,
    word: "EKE",
    pos: "(verb)",
    hindiMeaning: "बनाए रखना / कमी पूरा करना",
    meaning: "make an amount or supply of something last longer by using or consuming it frugally.",
    synonyms: ["save", "augment", "stretch", "economize"],
    antonyms: ["squander", "waste", "exhaust", "deplete"],
    usage: "She managed to eke out her student loan till the end of the academic year."
  },
  {
    id: 3,
    word: "CURATE",
    pos: "(verb)",
    hindiMeaning: "संग्रह करना / व्यवस्थित करना",
    meaning: "select, organize, and look after the items in a collection or exhibition.",
    synonyms: ["organize", "select", "manage", "assemble"],
    antonyms: ["neglect", "disorganize", "scatter", "disregard"],
    usage: "Both special art exhibitions are curated by independent museum specialists."
  },
  {
    id: 4,
    word: "GOSPEL",
    pos: "(noun)",
    hindiMeaning: "अकाट्य सत्य",
    meaning: "something that is accepted as unquestionably true.",
    synonyms: ["doctrine", "truth", "verity", "creed"],
    antonyms: ["falsehood", "lie", "myth", "fabrication"],
    usage: "You shouldn't take everything written in that tabloid as absolute gospel."
  },
  {
    id: 5,
    word: "CYNICISM",
    pos: "(noun)",
    hindiMeaning: "कुटिलता / निंदकता",
    meaning: "an inclination to believe that people are motivated purely by self-interest.",
    synonyms: ["skepticism", "distrust", "pessimism", "doubt"],
    antonyms: ["trust", "optimism", "faith", "naivety"],
    usage: "Her growing cynicism about human nature was understandable after years of trial."
  },
  {
    id: 6,
    word: "CORROBORATION",
    pos: "(noun)",
    hindiMeaning: "पुष्टि / समर्थन",
    meaning: "evidence that confirms or supports a statement, theory, or finding.",
    synonyms: ["confirmation", "verification", "validation", "substantiation"],
    antonyms: ["refutation", "contradiction", "denial", "disproof"],
    usage: "The police needed independent corroboration of the suspect's alibi."
  },
  {
    id: 7,
    word: "RENUNCIATION",
    pos: "(noun)",
    hindiMeaning: "त्याग / सन्यास",
    meaning: "the formal rejection of something, typically a belief, claim, or course of action.",
    synonyms: ["repudiation", "relinquishment", "abandonment", "abdication"],
    antonyms: ["acceptance", "assertion", "adoption", "claim"],
    usage: "His sudden renunciation of the royal title surprised the entire nation."
  },
  {
    id: 8,
    word: "PROBITY",
    pos: "(noun)",
    hindiMeaning: "ईमानदारी / सत्यनिष्ठा",
    meaning: "the quality of having strong moral principles; honesty and decency.",
    synonyms: ["integrity", "uprightness", "honesty", "rectitude"],
    antonyms: ["dishonesty", "deceit", "corruption", "unscrupulousness"],
    usage: "Financial probity is expected of anyone in a position of public trust."
  },
  {
    id: 9,
    word: "EXALT",
    pos: "(verb)",
    hindiMeaning: "प्रशंसा करना / पद बढ़ाना",
    meaning: "think or speak very highly of someone or something; elevate in rank.",
    synonyms: ["glorify", "praise", "extol", "laud"],
    antonyms: ["humiliate", "debase", "disparage", "condemn"],
    usage: "The essay exalts the virtues of traditional craftsmanship in modern design."
  },
  {
    id: 10,
    word: "EXCORIATE",
    pos: "(verb)",
    hindiMeaning: "आलोचना करना",
    meaning: "to criticize harshly and usually publicly.",
    synonyms: ["assail", "castigate", "lambaste", "vituperate", "imprecate"],
    antonyms: ["acclaim", "laud", "praise", "glorify", "admire", "exalt"],
    usage: "The stern judge will excoriate the behavior of the repeat offender by sentencing him to thirty years in prison."
  }
];

interface VocabSectionProps {
  language?: string;
}

export default function VocabSection({ language = 'en' }: VocabSectionProps) {
  const [vocabItems, setVocabItems] = useState<VocabItem[]>(VOCAB_DATA);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Starred / Bookmarked Words State & Persistence
  const [starredIds, setStarredIds] = useState<number[]>([]);
  const [showStarredOnly, setShowStarredOnly] = useState<boolean>(false);

  // Load Starred Words from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('starred_vocab_ids');
      if (saved) {
        setStarredIds(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load starred vocab ids:', e);
    }
  }, []);

  // Fetch dynamic vocabulary dataset from API
  useEffect(() => {
    const loadDynamicVocab = async () => {
      try {
        const res = await fetch('/api/vocab');
        const data = await res.json();
        if (data.success && Array.isArray(data.items) && data.items.length > 0) {
          setVocabItems(data.items);
          const excoriateIdx = data.items.findIndex((i: VocabItem) => i.word === 'EXCORIATE');
          if (excoriateIdx !== -1) {
            setCurrentIndex(excoriateIdx);
          } else {
            setCurrentIndex(0);
          }
        }
      } catch (e) {
        console.error('Failed to load dynamic vocab:', e);
      }
    };
    loadDynamicVocab();
  }, []);

  // Toggle Star / Bookmark Status
  const toggleStar = (id: number) => {
    setStarredIds(prev => {
      const isAlreadyStarred = prev.includes(id);
      const updated = isAlreadyStarred ? prev.filter(i => i !== id) : [...prev, id];
      try {
        localStorage.setItem('starred_vocab_ids', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save starred vocab ids:', e);
      }
      return updated;
    });
  };

  // Filtered Vocabulary items based on Search & Starred Only Toggle
  const filteredData = vocabItems.filter(item => {
    const matchesSearch =
      item.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.hindiMeaning.includes(searchQuery) ||
      item.meaning.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStar = showStarredOnly ? (item.id && starredIds.includes(item.id)) : true;

    return matchesSearch && matchesStar;
  });

  const activeItem = filteredData[currentIndex] || filteredData[0];

  const handleNext = () => {
    if (filteredData.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % filteredData.length);
  };

  const handlePrev = () => {
    if (filteredData.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + filteredData.length) % filteredData.length);
  };

  const handleSpeak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const isCurrentStarred = activeItem && activeItem.id ? starredIds.includes(activeItem.id) : false;

  return (
    <section className="bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full border border-amber-500/30">
              <Sparkles className="h-3 w-3 text-amber-500" />
              {language === 'hi' ? 'दैनिक शब्दावली बूस्टर' : 'Daily Vocabulary Booster'}
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5 tracking-tight">
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            {language === 'hi' ? 'शब्दावली बूस्टर (Vocabulary Booster)' : 'Vocabulary Booster'}
          </h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            {language === 'hi'
              ? 'परीक्षाओं में बार-बार पूछे जाने वाले अंग्रेजी शब्दों का सटीक अर्थ, हिंदी अनुवाद, पर्यायवाची और प्रयोग।'
              : 'Master high-yield English words with definitions, Hindi meanings, synonyms, antonyms & usage.'}
          </p>
        </div>
      </div>

      {/* Search Bar & Right-Shifted Starred Words Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="h-3 w-3 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentIndex(0);
            }}
            placeholder={language === 'hi' ? 'शब्द या अर्थ खोजें...' : 'Search word or meaning...'}
            className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 shadow-xs font-medium"
          />
        </div>

        {/* Right-Shifted Revision Starred Filter Button */}
        <button
          onClick={() => {
            setShowStarredOnly(!showStarredOnly);
            setCurrentIndex(0);
          }}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 border ${
            showStarredOnly
              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40'
          }`}
        >
          <Star className={`h-3.5 w-3.5 ${showStarredOnly ? 'fill-white text-white' : 'text-amber-500 fill-amber-400'}`} />
          <span className="font-normal">
            {language === 'hi' ? 'स्टार मार्क शब्द' : 'Revision Starred'} ({starredIds.length})
          </span>
        </button>
      </div>

      {/* CARD VIEW MODE */}
      {filteredData.length > 0 && activeItem ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          {/* Decorative Corner Art */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-bl-full pointer-events-none" />

          {/* Top Header Row of Card */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-wide">
                  {activeItem.id}. {activeItem.word}{' '}
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {activeItem.pos}
                  </span>
                </h3>
                <button
                  onClick={() => handleSpeak(`${activeItem.word}, ${activeItem.pos}`)}
                  title="Pronounce Word"
                  className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition active:scale-95 cursor-pointer"
                >
                  <Volume2 className="h-4 w-4" />
                </button>

                {/* Non-bold Starred indicator text tag */}
                {isCurrentStarred && (
                  <span className="text-xs font-normal text-amber-700 dark:text-amber-300 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800 px-2 py-0.5 rounded-md">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                    starred
                  </span>
                )}
              </div>

              {/* Hindi Meaning Block */}
              <div className="inline-block bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 px-2.5 py-0.5 rounded-md">
                <p className="text-xs font-extrabold text-amber-800 dark:text-amber-300 leading-snug whitespace-pre-line">
                  {activeItem.hindiMeaning}
                </p>
              </div>
            </div>

            {/* ONLY STAR ICON BUTTON ON CARD */}
            <button
              onClick={() => activeItem.id && toggleStar(activeItem.id)}
              className={`p-2 rounded-lg transition active:scale-95 cursor-pointer shrink-0 border shadow-xs ${
                isCurrentStarred
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
                  : 'bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-500 border-amber-300 dark:border-amber-800'
              }`}
              title={isCurrentStarred ? "Starred (Click to remove star)" : "Star word for revision"}
            >
              <Star className={`h-4 w-4 ${isCurrentStarred ? 'fill-white text-white' : 'fill-amber-400 text-amber-500'}`} />
            </button>
          </div>

          {/* Card Content Body */}
          <div className="space-y-2.5 text-xs">
            {/* English Meaning */}
            <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px] block mb-0.5">
                Meaning:
              </span>
              <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed text-[11px]">
                {activeItem.meaning}
              </p>
            </div>

            {/* Synonyms & Antonyms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {/* Synonyms */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                <span className="font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider text-[10px] block mb-1">
                  Synonyms:
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeItem.synonyms.map((syn, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-px rounded bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-300 font-bold text-[10px]"
                    >
                      {syn}
                    </span>
                  ))}
                </div>
              </div>

              {/* Antonyms */}
              <div className="bg-rose-50/70 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/40">
                <span className="font-black text-rose-800 dark:text-rose-400 uppercase tracking-wider text-[10px] block mb-1">
                  Antonyms:
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeItem.antonyms.map((ant, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-px rounded bg-rose-100/80 dark:bg-rose-900/40 text-rose-900 dark:text-rose-300 font-bold text-[10px]"
                    >
                      {ant}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Usage */}
            <div className="bg-blue-50/70 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
              <span className="font-black text-blue-800 dark:text-blue-400 uppercase tracking-wider text-[10px] block mb-0.5">
                Usage / Example:
              </span>
              <p className="text-slate-800 dark:text-slate-200 font-semibold italic text-[11px]">
                "{activeItem.usage}"
              </p>
            </div>
          </div>

          {/* Footer Carousel Pagination */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5 mt-3">
            <button
              onClick={handlePrev}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{language === 'hi' ? 'पिछला शब्द' : 'Previous'}</span>
            </button>

            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Word {currentIndex + 1} of {filteredData.length}
            </span>

            <button
              onClick={handleNext}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-sm"
            >
              <span>{language === 'hi' ? 'अगला शब्द' : 'Next Word'}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Empty State when Starred Only filter is active and 0 words are starred */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <Star className="h-10 w-10 text-amber-400 fill-amber-400 mx-auto animate-bounce" />
          <h4 className="text-base font-black text-slate-900 dark:text-white">
            {language === 'hi' ? 'कोई स्टार मार्क शब्द नहीं मिला' : 'No Starred Words Saved Yet'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto font-medium">
            {language === 'hi'
              ? 'किसी भी शब्द कार्ड पर ⭐ स्टार मार्क बटन पर क्लिक करके उसे रिवीजन सूची में जोड़ें।'
              : 'Click the ⭐ Star Mark button on any word card to save important vocabulary for quick revision!'}
          </p>
          <button
            onClick={() => setShowStarredOnly(false)}
            className="mt-2 px-4 py-2 bg-blue-600 text-white text-xs font-extrabold rounded-xl hover:bg-blue-700 transition cursor-pointer"
          >
            {language === 'hi' ? 'सभी शब्द देखें' : 'View All Words'}
          </button>
        </div>
      )}
    </section>
  );
}
