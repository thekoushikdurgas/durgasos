'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import {
  Compass,
  MapPin,
  Clock,
  BookOpen,
  ChevronRight,
  Users,
  Search,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  Calendar,
  Layers,
  Info,
  History,
  X,
  Play,
  RefreshCw,
  Bookmark,
  Star,
  LogIn,
  LogOut,
  Trash2,
  Download,
} from 'lucide-react';
import {
  onAuthStateChanged,
  User,
  signInWithPopup as fbSignInWithPopup,
  signOut as fbSignOut,
  signInAnonymously,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

import { ModuleAppShell } from '@/components/apps/ModuleAppShell';
import { useAuthSession } from '@/components/auth/AuthSessionContext';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  signInWithPopup,
  signOut,
} from './time-machine/firebase';
import InteractiveMap from './time-machine/InteractiveMap';
import AROverlay from './time-machine/AROverlay';
import FutureForecast from './time-machine/FutureForecast';

interface Pin {
  title: string;
  year: any;
  latitude: number;
  longitude: number;
  description?: string;
  keyFigures?: string[];
  dateFormatted?: string;
  sources?: Array<{ name: string; url: string }>;
  causes?: string;
  consequences?: string;
  location?: string;
}

interface HistoricalEvent {
  title: string;
  year: number;
  latitude: number;
  longitude: number;
  description: string;
  keyFigures: string[];
  dateFormatted: string;
  sources: Array<{ name: string; url: string }>;
  causes?: string;
  consequences?: string;
  location?: string;
}

interface SensoryLog {
  sensoryTitle: string;
  sensoryDescription: string;
  keyFigures: Array<{ name: string; role: string; bio: string }>;
  virtualEvents: Array<{ title: string; context: string; reference: string }>;
  ambientToneRate: { description: string; frequency: string };
}

interface ForecastResult {
  historicalTrendSummary: string;
  milestones: Array<{
    year: string;
    title: string;
    description: string;
    probability: number;
    outcomeType?: string;
  }>;
  projections: Array<{
    milestoneYear: string;
    scenarioTitle: string;
    scenarioDetails: string;
    futureImpact: string;
    confidenceRating?: string;
  }>;
  trendPoints?: Array<{ yearOffset: number; low: number; median: number; high: number }>;
  confidenceIntervalInfo?: { metricName: string; explanation: string };
}

// Built-in Premium curated historical moments
const CURATED_EVENTS: HistoricalEvent[] = [
  {
    title: 'Construction of the Library of Alexandria',
    year: -285,
    latitude: 31.2,
    longitude: 29.918,
    dateFormatted: 'C. 285 B.C.',
    description:
      'The gathering of all documented human intellect into a singular physical beacon. Scholars and scribes from Greece, Persia, and Egypt collaborate to transcribe ancient papyrus scrolls, creating the first truly universal repository of mechanics, mathematics, and philosophy.',
    keyFigures: ['Ptolemy I Soter (Sovereign)', 'Demetrius of Phalerum (Chief Scribe)'],
    sources: [
      {
        name: 'The House of Ptolemy Recital Catalog',
        url: 'https://www.britannica.com/topic/Library-of-Alexandria',
      },
      {
        name: 'Royal Alexandria Papyrus Collections',
        url: 'https://www.worldhistory.org/Library_of_Alexandria/',
      },
    ],
    causes:
      'Under Ptolemy I Soter, the newly founded Greek dynasty in Egypt desired to establish undisputed intellectual superiority and cultural hegemony across the Mediterranean. This drove a competitive effort to store, translate, and synthesize all foreign manuscripts from Persia, India, Greece, and Egypt into a single accessible repository.',
    consequences:
      'It institutionalized the scholastic tradition, attracting legendary minds like Euclid, Eratosthenes, and Archimedes. It pioneered standard textual criticism, cataloging systems, and preserved invaluable documents from antiquity, though its eventual loss led to fragmented historical trails.',
    location:
      'The Royal Quarter (Bruchion) of Alexandria, Egypt, near the Mediterranean harbor front.',
  },
  {
    title: 'The Signing of the Magna Carta',
    year: 1215,
    latitude: 51.444,
    longitude: -0.565,
    dateFormatted: 'June 15, 1215 A.D.',
    description:
      'At the marshy fields of Runnymede, rebellious barons force King John of England to sign a charter restricting absolute sovereign power. It declares that even the king is bound by law, laying the cornerstone for constitutional systems and modern civil liberties.',
    keyFigures: ['King John of England (Sovereign)', 'Archbishop Stephen Langton (Mediator)'],
    sources: [
      {
        name: 'British Library Magna Carta Original Manuscript',
        url: 'https://www.bl.uk/magna-carta',
      },
      {
        name: 'Chronicles of Matthew Paris of St Albans',
        url: 'https://www.archives.gov/exhibits/featured-documents/magna-carta',
      },
    ],
    causes:
      "King John's extreme feudal taxation, unsuccessful foreign military campaigns in France to reclaim lost territories, abuse of forest rights/privileges, and aggressive clashes with Pope Innocent III alienated the English nobility, inciting an armed baron rebellion.",
    consequences:
      'It restricted the absolute powers of the crown, declaring that even the ultimate sovereign is bound by the law of the land. It established early rules for habeas corpus and due process (Clause 39), serving as the foundational model for constitutional democracy and human rights worldwide.',
    location: 'Runnymede Meadow near Windsor, Surrey, England, along the River Thames.',
  },
  {
    title: 'The Coronation of Mansa Musa',
    year: 1312,
    latitude: 12.639,
    longitude: -8.002,
    dateFormatted: 'C. 1312 A.D.',
    description:
      'Mansa Musa ascends the throne of the Mali Empire. Controlling the global gold trade and Sahara salt routes, he transforms Mali into the intellectual and cultural epicenter of Africa, establishing prestigious madrasas and commissioning monumental architecture in Timbuktu.',
    keyFigures: ['Mansa Musa (Emperor)', 'Abu Bakr II (Navigator Sovereign)'],
    sources: [
      {
        name: "Al-Umari's Islamic Court Chronicles",
        url: 'https://www.nationalgeographic.org/encyclopedia/mansa-musa/',
      },
      { name: 'Timbuktu National Library Archives', url: 'https://whc.unesco.org/en/list/119/' },
    ],
    causes:
      'The unexpected maritime voyage of Emperor Abu Bakr II, who sailed into the Atlantic Ocean with a massive exploratory fleet and never returned, automatically left the Malian crown to his loyal deputy, Mansa Musa, in c. 1312 A.D.',
    consequences:
      'Mansa Musa elevated the Mali Empire to international political and cultural prominence. His historic pilgrimage to Mecca in 1324 distributed vast amounts of gold (temporarily devaluing it in Cairo), funded prestigious scholarly institutions in Sankore, and placed West Africa indelibly on map catalogs.',
    location: 'Niani (Imperial Mali Capital) and Timbuktu Scriptorium Hub, West Africa.',
  },
  {
    title: 'The Apollo 11 Lunar Landing',
    year: 1969,
    latitude: 28.572,
    longitude: -80.648,
    dateFormatted: 'July 16, 1969 A.D.',
    description:
      'Humanity makes its first physical contact with another celestial body. The Saturn V launch vehicle thunders off Pad 39A at Cape Canaveral, carrying astronauts Neil Armstrong, Buzz Aldrin, and Michael Collins to a historic rendezvous on the lunar basalt plains.',
    keyFigures: ['Neil Armstrong (Commander)', 'Katherine Johnson (Lead Flight Mathematician)'],
    sources: [
      { name: 'NASA Apollo Command Module Flight Log', url: 'https://history.nasa.gov/alsj/a11/' },
      {
        name: 'Smithsonian Aerospace Archives #1969',
        url: 'https://airandspace.si.edu/explore-and-learn/topics/apollo/apollo-11',
      },
    ],
    causes:
      "The geopolitical and ideological Cold War rivalry between the United States and the Soviet Union, catalyzed by the Soviet launch of Sputnik and President John F. Kennedy's 1961 challenge to put a human on the moon before the decade expired.",
    consequences:
      'Humans strolled on another celestial body for the first time, collecting crucial lunar core and rock samples, demonstrating unprecedented aerospace technology feats, and establishing a new paradigm of international television broadcasting.',
    location:
      'Launch Pad 39A, Kennedy Space Center, Florida (Earth), transitioning to Sea of Tranquility, lunar basalt plains (The Moon).',
  },
];

export function TimeMachineApp() {
  // Navigation & Primary Target Coordinates State
  const [selectedYear, setSelectedYear] = useState<number>(1215);
  const [selectedLat, setSelectedLat] = useState<number>(51.444);
  const [selectedLng, setSelectedLng] = useState<number>(-0.565);
  const [locationNameInput, setLocationNameInput] = useState<string>('Runnymede, England');
  const [eraName, setEraName] = useState<string>('Middle Ages');
  const [eraDescription, setEraDescription] = useState<string>(
    'Sovereign rule meets constitutional restriction'
  );

  // Get OS auth session
  const { ready: osReady, authenticated: osAuthed, user: osUser } = useAuthSession();
  const isOsUser = Boolean(osAuthed && osUser);

  // Firebase Auth and saved journeys states
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [savedJourneys, setSavedJourneys] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedJourneysSearchQuery, setSavedJourneysSearchQuery] = useState<string>('');

  // Filter saved journeys based on search query across title, locationName, and eraName
  const filteredSavedJourneys = savedJourneys.filter((item) => {
    if (!savedJourneysSearchQuery) return true;
    const queryStr = savedJourneysSearchQuery.toLowerCase().trim();
    const titleMatch = item.title && String(item.title).toLowerCase().includes(queryStr);
    const locationMatch =
      item.locationName && String(item.locationName).toLowerCase().includes(queryStr);
    const eraMatch = item.eraName && String(item.eraName).toLowerCase().includes(queryStr);
    return titleMatch || locationMatch || eraMatch;
  });

  // Monitor auth status and merge with OS registered session
  useEffect(() => {
    if (!osReady) {
      return;
    }

    if (osAuthed && osUser) {
      queueMicrotask(() => {
        setUser({
          uid: osUser.id,
          email: osUser.email || '',
          displayName: osUser.username || 'Explorer',
          photoURL: osUser.avatar_url || null,
        } as any);
        setAuthLoading(false);
      });

      // Proactively sign in anonymously to ensure the Firestore client context is authorized
      const ensureFirebaseAuthed = async () => {
        try {
          if (!auth.currentUser) {
            await signInAnonymously(auth);
          }
        } catch (err) {
          console.error('Firebase anonymous auth registration failed:', err);
        }
      };
      ensureFirebaseAuthed();
    } else {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
        if (!currentUser) {
          setSavedJourneys([]);
        }
      });
      return () => unsubscribe();
    }
  }, [osReady, osAuthed, osUser]);

  // Sync real-time saved journeys subscription
  useEffect(() => {
    if (!user) {
      return;
    }

    const q = query(collection(db, 'saved_journeys'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((docRef) => {
          items.push({ id: docRef.id, ...docRef.data() });
        });
        // Sort in-memory desc by createdAt
        items.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        setSavedJourneys(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'saved_journeys');
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Authentication sign-in error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleExportPDF = () => {
    if (!detailedEvent) {
      alert('No active historical event selected to export.');
      return;
    }

    try {
      const doc = new jsPDF();
      let y = 15;

      const drawSeparatorLine = () => {
        doc.setDrawColor(245, 158, 11); // Amber
        doc.setLineWidth(0.4);
        doc.line(20, y, 190, y);
        y += 8;
      };

      const ensureSpace = (neededHeight: number) => {
        if (y + neededHeight > 275) {
          doc.addPage();
          y = 15;
        }
      };

      // 1. HEADER HERO BAR
      doc.setFillColor(15, 12, 8); // Very dark brown/slate
      doc.rect(15, 12, 180, 20, 'F');

      doc.setTextColor(245, 158, 11); // Gold/Amber
      doc.setFont('times', 'italic');
      doc.setFontSize(18);
      doc.text('CHRONOCRAFT TIME TRAVEL SYSTEM RECORD', 20, 25);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `COAXIAL RECORD LOG: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`,
        140,
        24
      );

      y = 42;

      // 2. TIMELINE EVENT TITLE
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(0, 0, 0);
      const titleLines = doc.splitTextToSize(detailedEvent.title.toUpperCase(), 170);
      doc.text(titleLines, 20, y);
      y += titleLines.length * 6;

      // Metadata information
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);

      const formattedYear = detailedEvent.year
        ? parseInt(detailedEvent.year) < 0
          ? `${Math.abs(parseInt(detailedEvent.year))} B.C.`
          : `${detailedEvent.year} A.D.`
        : `${selectedYear}`;
      const locationText = `Location: ${detailedEvent.location || locationNameInput} | Era: ${eraName}`;
      const coordinatesText = `Space-Time Coords: [LAT: ${detailedEvent.latitude?.toFixed(4)}°N, LNG: ${detailedEvent.longitude?.toFixed(4)}°E] | Target temporal stamp: ${formattedYear}`;

      doc.text(locationText, 20, y);
      y += 5;
      doc.text(coordinatesText, 20, y);
      y += 6;

      drawSeparatorLine();

      // 3. NARRATIVE & CONTEXT
      ensureSpace(35);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('— HISTORICAL NARRATIVE & GEOPOLITICAL ANALYSIS', 20, y);
      y += 6;

      doc.setFont('times', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      const descriptionToRender =
        detailedEvent.description || 'Temporal narrative telemetry logs active.';
      const descLines = doc.splitTextToSize(`"${descriptionToRender}"`, 170);
      doc.text(descLines, 20, y);
      y += descLines.length * 5.2 + 6;

      // Causes & Consequences
      if (detailedEvent.causes || detailedEvent.consequences) {
        ensureSpace(40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('— SPATIO-TEMPORAL CAUSALITY SEQUENCE', 20, y);
        y += 6;

        if (detailedEvent.causes) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(154, 52, 18); // Dark orange
          doc.text('SOCIETAL CAUSES & SYSTEM DRIVERS:', 20, y);
          y += 4.5;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(60, 60, 60);
          const causeLines = doc.splitTextToSize(detailedEvent.causes, 170);
          doc.text(causeLines, 20, y);
          y += causeLines.length * 4.5 + 4.5;
        }

        if (detailedEvent.consequences) {
          ensureSpace(20);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(154, 52, 18);
          doc.text('TEMPORAL RIPPLES & SYSTEMIC CONSEQUENCES:', 20, y);
          y += 4.5;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(60, 60, 60);
          const consLines = doc.splitTextToSize(detailedEvent.consequences, 170);
          doc.text(consLines, 20, y);
          y += consLines.length * 4.5 + 6;
        }
      }

      // Key figures
      if (detailedEvent.keyFigures && detailedEvent.keyFigures.length > 0) {
        ensureSpace(30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('— VITAL FIGURES ACTIVE IN ARCHIVES', 20, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        const figuresListStr = Array.isArray(detailedEvent.keyFigures)
          ? detailedEvent.keyFigures.join(', ')
          : detailedEvent.keyFigures;
        const figLines = doc.splitTextToSize(figuresListStr, 170);
        doc.text(figLines, 20, y);
        y += figLines.length * 5 + 6;
      }

      // 4. SENSORY ATMOSPHERE RECORDS (If available)
      if (sensoryResult) {
        ensureSpace(50);
        drawSeparatorLine();

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(245, 158, 11); // Amber/Gold
        doc.text('★ ACTIVE TEMPORAL SENSORY COAXIAL LOG', 20, y);
        y += 7;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Atmosphere Reconstruction: ${sensoryResult.sensoryTitle}`, 20, y);
        y += 5.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(50, 50, 50);
        const senseDescLines = doc.splitTextToSize(sensoryResult.sensoryDescription, 170);
        doc.text(senseDescLines, 20, y);
        y += senseDescLines.length * 4.6 + 6;

        // Reconstructed figures
        if (sensoryResult.keyFigures && sensoryResult.keyFigures.length > 0) {
          ensureSpace(35);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.text('— PROMINENT OBSERVERS & PERSONAS TRACKED', 20, y);
          y += 5.5;

          sensoryResult.keyFigures.forEach((fig) => {
            ensureSpace(16);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(30, 30, 30);
            doc.text(`• ${fig.name} [${fig.role}]`, 22, y);
            y += 4;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(70, 70, 70);
            const bioLines = doc.splitTextToSize(fig.bio, 163);
            doc.text(bioLines, 25, y);
            y += bioLines.length * 4 + 3;
          });
        }

        // Reconstructed local events
        if (sensoryResult.virtualEvents && sensoryResult.virtualEvents.length > 0) {
          ensureSpace(35);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.text('— DYNAMIC TIME-SPACE CO-OCCURRENCES DETECTED', 20, y);
          y += 5.5;

          sensoryResult.virtualEvents.forEach((ev) => {
            const contextLines = doc.splitTextToSize(ev.context, 162);
            ensureSpace(contextLines.length * 4.2 + 10);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(30, 30, 30);
            doc.text(`» ${ev.title}`, 22, y);
            y += 4;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(75, 75, 75);
            doc.text(contextLines, 25, y);
            y += contextLines.length * 4 + 1.5;

            doc.setFont('helvetica', 'oblique');
            doc.setFontSize(7.5);
            doc.setTextColor(110, 110, 110);
            doc.text(`Source Reference Point: ${ev.reference}`, 25, y);
            y += 4.5;
          });
        }

        // Ambient noise signature
        if (sensoryResult.ambientToneRate) {
          ensureSpace(16);
          doc.setFillColor(245, 158, 11, 0.05); // Subtle golden background
          doc.rect(20, y, 170, 9.5, 'F');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          doc.text(
            `AMBIENT AUDIO MATRIX: "${sensoryResult.ambientToneRate.description.toUpperCase()}"`,
            23,
            y + 6
          );

          doc.setFont('courier', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(180, 83, 9); // Gold darker
          doc.text(sensoryResult.ambientToneRate.frequency, 153, y + 6);
          y += 14;
        }
      }

      // 5. RENDER PAGE FOOTERS & DECORATIONS ON ALL PAGES
      const totalPages = doc.getNumberOfPages();
      for (let pIdx = 1; pIdx <= totalPages; pIdx++) {
        doc.setPage(pIdx);

        // Bottom divider rule
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(20, 285, 190, 285);

        // Footer Text
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `CHRONOCRAFT RECORD ARCHIVE SEED | COORDINATES LOCK: [${detailedEvent.latitude?.toFixed(3)}, ${detailedEvent.longitude?.toFixed(3)}]`,
          20,
          289
        );
        doc.text(`Page ${pIdx} of ${totalPages}`, 175, 289);
      }

      const rawFileName = `${detailedEvent.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_time_log.pdf`;
      doc.save(rawFileName);
    } catch (err) {
      console.error('Error building PDF export log document:', err);
      alert('An unexpected error occurred while compiling the PDF: ' + (err as any).message);
    }
  };

  const handleSaveJourney = async (
    title: string,
    type: 'preset' | 'custom' | 'forecast',
    customData?: {
      year?: number;
      locationName?: string;
      latitude?: number;
      longitude?: number;
      eraName?: string;
      eraDescription?: string;
      description?: string;
    }
  ) => {
    if (!user) {
      alert('Please sign in first to save your journeys and bookmark timelines.');
      return;
    }

    setIsSaving(true);
    const path = 'saved_journeys';
    try {
      let rawYear = customData?.year !== undefined ? customData.year : selectedYear;
      let parsedYear =
        typeof rawYear === 'string' ? parseInt(rawYear, 10) : Math.round(Number(rawYear));
      if (isNaN(parsedYear)) parsedYear = 2026;
      parsedYear = Math.max(-5000, Math.min(3000, parsedYear));

      let parsedLat = Number(
        customData?.latitude !== undefined ? customData.latitude : selectedLat
      );
      if (isNaN(parsedLat)) parsedLat = 0.0;
      parsedLat = Math.max(-90.0, Math.min(90.0, parsedLat));

      let parsedLng = Number(
        customData?.longitude !== undefined ? customData.longitude : selectedLng
      );
      if (isNaN(parsedLng)) parsedLng = 0.0;
      parsedLng = Math.max(-180.0, Math.min(180.0, parsedLng));

      const payload = {
        userId: user.uid,
        title: (title || 'Untitled Exploration').substring(0, 100),
        year: parsedYear,
        locationName: (
          customData?.locationName ||
          locationNameInput ||
          'Unknown Coordinate'
        ).substring(0, 150),
        latitude: parsedLat,
        longitude: parsedLng,
        eraName: (customData?.eraName || eraName || 'Unknown Era').substring(0, 100),
        eraDescription: (customData?.eraDescription || eraDescription || '').substring(0, 500),
        description: (customData?.description || '').substring(0, 2000),
        createdAt: serverTimestamp(),
        type: type,
      };

      const docId = `journey_${Math.random().toString(36).substring(2, 11)}`;
      await setDoc(doc(db, path, docId), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteJourney = async (journeyId: string) => {
    const path = `saved_journeys/${journeyId}`;
    try {
      await deleteDoc(doc(db, 'saved_journeys', journeyId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // Autocomplete Suggestions System States
  const [suggestions, setSuggestions] = useState<
    Array<{ description: string; place_id: string; isRealGoogle: boolean }>
  >([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState<boolean>(false);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);

  const autocompleteInputReady =
    !isSelecting && !!locationNameInput && locationNameInput.trim().length >= 3;
  const visibleSuggestions = autocompleteInputReady ? suggestions : [];
  const visibleShowSuggestions = autocompleteInputReady && showSuggestions;

  // Debounced search trigger for autocomplete suggestions list
  useEffect(() => {
    if (isSelecting) return;
    if (!locationNameInput || locationNameInput.trim().length < 3) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        const response = await fetch('/api/places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'autocomplete',
            input: locationNameInput,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.predictions || []);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Autocomplete list error:', err);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [locationNameInput, isSelecting]);

  const handleSelectSuggestion = async (item: { description: string; place_id: string }) => {
    setIsSelecting(true);
    setLocationNameInput(item.description);
    setShowSuggestions(false);
    setSuggestions([]);

    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'details',
          place_id: item.place_id,
          description: item.description,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.lat !== undefined && data.lng !== undefined) {
          setSelectedLat(data.lat);
          setSelectedLng(data.lng);
        }
      }
    } catch (err) {
      console.error('Coordinate detail resolution error:', err);
    } finally {
      setTimeout(() => setIsSelecting(false), 500);
    }
  };

  // Custom events & map pins system
  const [activePinIndex, setActivePinIndex] = useState<number | null>(1);
  const [sessionPins, setSessionPins] = useState<Pin[]>(CURATED_EVENTS);
  const [isSearchingPins, setIsSearchingPins] = useState<boolean>(false);

  // Dedicated Detail Screen Selected Event State (Matches "detailed view for historical events")
  const [detailedEvent, setDetailedEvent] = useState<HistoricalEvent | Pin | null>(
    CURATED_EVENTS[1]
  );

  // Sensory AI Time Travel Sim Results State
  const [sensoryLoading, setSensoryLoading] = useState<boolean>(false);
  const [sensoryResult, setSensoryResult] = useState<SensoryLog | null>({
    sensoryTitle: 'Feudal Legal Armistice',
    sensoryDescription:
      'The smell of rich river silt and damp marsh air floats over Runnymede as high-ranking barons, clad in chainmail, stand vigilant on wet soil. Brightly colored pennants snap in the stiff wind while squires murmur in tents, their breath fogging in the cool June breeze.',
    keyFigures: [
      {
        name: 'Stephen Langton',
        role: 'Archbishop of Canterbury',
        bio: 'The intellectual architect who drafted the original liberties layout incorporated into the Great Charter.',
      },
      {
        name: 'King John Lackland',
        role: 'Plantagenet Sovereign',
        bio: 'Faced with total rebellion, he reluctantly sealed the Magna Carta under coercion, setting historical limits on royal decrees.',
      },
    ],
    virtualEvents: [
      {
        title: 'Baronial Assembly of the Oath',
        context:
          'Barons gather to swear a mutual pact of resistance against unchecked coronation taxation rules.',
        reference: 'British Chronicles #M11',
      },
      {
        title: 'The Sealing Ceremony',
        context:
          'The King attaches the Great Seal, officially making the legal declarations binding on all descendants.',
        reference: 'Royal Scriptorium Records V2',
      },
    ],
    ambientToneRate: {
      description: 'Rustling parchment, muffled plate armor, and wind in the reeds',
      frequency: '112 Hz',
    },
  });

  // Future Forecasting parameters & states
  const [forecastTopicSelect, setForecastTopicSelect] = useState<string>(
    'Urban Architecture & Ecology'
  );
  const [techLevel, setTechLevel] = useState<string>('Moderate');
  const [societalChange, setSocietalChange] = useState<string>('Moderate Evolution');
  const [environmentalShift, setEnvironmentalShift] = useState<string>('Stable');
  const [timeHorizon, setTimeHorizon] = useState<string>('Immediate Centenary (100-300 yrs)');
  const [customCatalyst, setCustomCatalyst] = useState<string>('');
  const [currentTrends, setCurrentTrends] = useState<string>(
    'Decentralized networks, AI automation, circular energy grid'
  );
  const [historicalEventTypes, setHistoricalEventTypes] = useState<string>(
    'Sovereignty & Charters, Discoveries & Technics'
  );
  const [forecastLoading, setForecastLoading] = useState<boolean>(false);
  const [forecastData, setForecastData] = useState<ForecastResult | null>({
    historicalTrendSummary:
      'Constitutional law and local communal covenants directly layout the groundwork for decentralized autonomous micro-governments and carbon credit ledgers.',
    milestones: [
      {
        year: '2125 AD',
        title: 'Decentralized Municipal Charters',
        description:
          'Global cities formalize automated micro-pacts governed by local materials registries, replacing state-centralized codes.',
        probability: 82,
        outcomeType: 'High-Probability Extrapolation',
      },
      {
        year: '2280 AD',
        title: 'Carbon Consensus Shrines',
        description:
          'Civic spaces feature physically locked carbon-capture sensors backed by historic environmental laws, establishing green zones.',
        probability: 67,
        outcomeType: 'Conditional Plausibility',
      },
    ],
    projections: [
      {
        milestoneYear: '2150 AD',
        scenarioTitle: 'The Runnymede Eco-Pact',
        scenarioDetails:
          'Autonomous land trusts seal automated carbon agreements on historic public soils, returning wetlands to native biodomes.',
        futureImpact:
          'Ecosystem governance index increases by 45% based on localized community sovereignty.',
        confidenceRating: 'Plausible Scenario',
      },
      {
        milestoneYear: '2300 AD',
        scenarioTitle: 'Consensus Net Harmony',
        scenarioDetails:
          'Flux core grids align local governance systems with atmospheric data, locking eco-techno harmony parameters.',
        futureImpact:
          'Global civic transparency matches high-fidelity structural goals set in antiquity.',
        confidenceRating: 'Wildcard Scenario Branch',
      },
    ],
    trendPoints: [
      { yearOffset: 25, low: 48, median: 55, high: 62 },
      { yearOffset: 50, low: 42, median: 58, high: 72 },
      { yearOffset: 100, low: 35, median: 64, high: 85 },
      { yearOffset: 250, low: 22, median: 70, high: 95 },
    ],
    confidenceIntervalInfo: {
      metricName: 'Socio-Ecological Stability Metric',
      explanation:
        'Predictive variance spreads outward from a ±7% tight offset at 25y to a wide ±36% volatility spectrum at 250y, illustrating cumulative socio-technological bifurcation.',
    },
  });

  // Handle preset era click
  const handleEraSelection = (eraKey: string) => {
    switch (eraKey) {
      case 'alexandria':
        setSelectedYear(-285);
        setSelectedLat(31.2);
        setSelectedLng(29.918);
        setLocationNameInput('Alexandria, Egypt');
        setEraName('Classical Antiquity');
        setEraDescription('Intellectual breakthroughs and monument building');
        // Load closest curated pin if exists
        setDetailedEvent(CURATED_EVENTS[0]);
        setActivePinIndex(0);
        break;
      case 'feudal':
        setSelectedYear(1215);
        setSelectedLat(51.444);
        setSelectedLng(-0.565);
        setLocationNameInput('Runnymede, England');
        setEraName('Middle Ages');
        setEraDescription('Sovereign rule meets constitutional restriction');
        setDetailedEvent(CURATED_EVENTS[1]);
        setActivePinIndex(1);
        break;
      case 'musa':
        setSelectedYear(1312);
        setSelectedLat(12.639);
        setSelectedLng(-8.002);
        setLocationNameInput('Bamako, Mali Empire');
        setEraName('Mali Golden Age');
        setEraDescription('Sovereigns of gold, salt, and universal scholarship');
        setDetailedEvent(CURATED_EVENTS[2]);
        setActivePinIndex(2);
        break;
      case 'apollo':
        setSelectedYear(1969);
        setSelectedLat(28.572);
        setSelectedLng(-80.648);
        setLocationNameInput('Cape Canaveral, USA');
        setEraName('Space Age');
        setEraDescription('The giant leap beyond terrestrial limits');
        setDetailedEvent(CURATED_EVENTS[3]);
        setActivePinIndex(3);
        break;
    }
  };

  // State variables for managing detailed popups for historical events
  const [isHistoricalPopupOpen, setIsHistoricalPopupOpen] = useState<boolean>(false);
  const [popupEvents, setPopupEvents] = useState<Pin[]>([]);
  const [popupLoading, setPopupLoading] = useState<boolean>(false);
  const [activePopupEventIndex, setActivePopupEventIndex] = useState<number>(0);

  // Helper utility to select engaging background illustrations or Unsplash imagery for historical epochs
  const getEventImage = (title: string, year: number): string => {
    const lower = title.toLowerCase();
    if (lower.includes('alexandria') || lower.includes('phar') || lower.includes('library')) {
      return 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=800&q=80'; // ancient luxury library
    }
    if (lower.includes('magna carta') || lower.includes('charter') || lower.includes('john')) {
      return 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80'; // old historical scroll/manuscript
    }
    if (
      lower.includes('musa') ||
      lower.includes('mali') ||
      lower.includes('timbuktu') ||
      lower.includes('gold')
    ) {
      return 'https://images.unsplash.com/photo-1608927459744-8d486effd08f?auto=format&fit=crop&w=800&q=80'; // ancient camel/gold/desert caravan
    }
    if (
      lower.includes('apollo') ||
      lower.includes('lunar') ||
      lower.includes('space') ||
      lower.includes('moon')
    ) {
      return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80'; // deep space/astronomy/apollo
    }
    if (
      lower.includes('rome') ||
      lower.includes('caesar') ||
      lower.includes('senate') ||
      lower.includes('roman')
    ) {
      return 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80'; // classic colosseum / rome
    }
    if (lower.includes('eruption') || lower.includes('pompeii') || lower.includes('volcano')) {
      return 'https://images.unsplash.com/photo-1500964757637-c85e8a162699?auto=format&fit=crop&w=800&q=80'; // landscape ruins
    }
    if (lower.includes('renaissance') || lower.includes('da vinci') || lower.includes('art')) {
      return 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80'; // premium art / oil painting
    }
    if (year < -100) {
      return 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80'; // classical greek columns
    } else if (year < 1450) {
      return 'https://images.unsplash.com/photo-1508849789987-4e5333c12b78?auto=format&fit=crop&w=800&q=80'; // medieval castle
    } else if (year < 1850) {
      return 'https://images.unsplash.com/photo-1447069387593-a5de0862481e?auto=format&fit=crop&w=800&q=80'; // old world navigation maps / historical compass
    } else if (year >= 1850 && year < 1950) {
      return 'https://images.unsplash.com/photo-1485613961133-cd285ae14450?auto=format&fit=crop&w=800&q=80'; // steam tech / engines
    } else {
      return 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80'; // tech / cyber gears
    }
  };

  // Triggers dynamic scanning for key historical events near selected location and year coordinates
  const handleMapSelectionTrigger = async (lat: number, lng: number, year: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    setIsHistoricalPopupOpen(true);
    setPopupLoading(true);
    setActivePopupEventIndex(0);

    const displayLoc = `Coords: [${lat.toFixed(3)}, ${lng.toFixed(3)}]`;
    setLocationNameInput(displayLoc);

    try {
      const response = await fetch('/api/time-travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest-pins',
          locationName: displayLoc,
          year: year,
        }),
      });

      if (response.ok) {
        const data: Pin[] = await response.json();
        if (data && data.length > 0) {
          const formatted: Pin[] = data.map((v) => ({
            ...v,
            latitude: Number(v.latitude) || lat,
            longitude: Number(v.longitude) || lng,
          }));
          setPopupEvents(formatted);

          // Merge any newly scanned coordinates pins into the Map's rendering set so they stay visible
          setSessionPins((prev) => {
            const existingTitles = new Set(prev.map((p) => p.title.toLowerCase()));
            const uniqueNew = formatted.filter((p) => !existingTitles.has(p.title.toLowerCase()));
            return [...uniqueNew, ...prev];
          });
        } else {
          setPopupEvents([]);
        }
      } else {
        setPopupEvents([]);
      }
    } catch (err) {
      console.error('Map coordinates automatic chronological scan failed:', err);
      setPopupEvents([]);
    } finally {
      setPopupLoading(false);
    }
  };

  // Warp & Travel trigger (Triggers sensory AI logs)
  const handleTemporalWarp = async () => {
    setSensoryLoading(true);
    try {
      const response = await fetch('/api/time-travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'time-travel',
          locationName: locationNameInput,
          targetDate: selectedYear < 0 ? `${Math.abs(selectedYear)} B.C.` : `${selectedYear} A.D.`,
          eraName: eraName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSensoryResult(data);
      } else {
        console.error('API response error');
      }
    } catch (err) {
      console.error('Temporal travel route error:', err);
    } finally {
      setSensoryLoading(false);
    }
  };

  // Suggest local coordinates historical pins (Generate pin with full description, figures, sources!)
  const handleScanForPins = async (lat: number, lng: number) => {
    setIsSearchingPins(true);
    try {
      const response = await fetch('/api/time-travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest-pins',
          locationName: `Coords: [${lat.toFixed(3)}, ${lng.toFixed(3)}]`,
          year: selectedYear,
        }),
      });

      if (response.ok) {
        const data: Pin[] = await response.json();
        if (data && data.length > 0) {
          // Merge newly generated pins into session set
          const formatted: Pin[] = data.map((v) => ({
            ...v,
            latitude: Number(v.latitude) || lat,
            longitude: Number(v.longitude) || lng,
          }));
          setSessionPins((prev) => [...formatted, ...prev]);
          // Automatically highlight and open detailed view of the first suggested event!
          setDetailedEvent(formatted[0]);
          setActivePinIndex(sessionPins.length); // Point to new pin
        }
      }
    } catch (err) {
      console.error('Pin suggestion failure', err);
    } finally {
      setIsSearchingPins(false);
    }
  };

  // Forecast future states
  const handleFutureForecast = async () => {
    setForecastLoading(true);
    try {
      const formattedDate =
        selectedYear < 0 ? `${Math.abs(selectedYear)} B.C.` : `${selectedYear} A.D.`;
      const response = await fetch('/api/time-travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'forecast',
          locationName: locationNameInput,
          targetDate: formattedDate,
          eraName: eraName,
          forecastTopic: forecastTopicSelect,
          techLevel,
          societalChange,
          environmentalShift,
          timeHorizon,
          customCatalyst,
          currentTrends,
          historicalEventTypes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setForecastData(data);
      }
    } catch (err) {
      console.error('Forecast API failure', err);
    } finally {
      setForecastLoading(false);
    }
  };

  // Synchronise active pin logic mapping
  const selectPinHandler = (idx: number) => {
    setActivePinIndex(idx);
    const target = sessionPins[idx];
    if (target) {
      setSelectedLat(target.latitude);
      setSelectedLng(target.longitude);
      setDetailedEvent(target);
      setLocationNameInput(target.title);
      // Synthesize matching year
      const parsedYear = parseInt(target.year);
      if (!isNaN(parsedYear)) {
        setSelectedYear(parsedYear);
      }
    }
  };

  return (
    <ModuleAppShell>
      <div className="w-full text-zinc-200 selection:bg-amber-500/30 selection:text-white">
        {/* 1. TOP PREMIUM HEADER */}
        <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-40 px-6 py-4 rounded-t-2xl">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow-[0_4px_16px_rgba(245,158,11,0.2)] flex items-center justify-center">
                <Compass className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-widest text-white uppercase font-serif italic">
                  CHRONOCRAFT
                </h1>
                <span className="text-[10px] text-amber-500 font-mono tracking-wider block">
                  TIME MACHINE CODEX & SPATIO-CHRONO TELEPORT
                </span>
              </div>
            </div>

            {/* Quick Stats bar + Auth Control System */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono bg-zinc-950 px-3.5 py-1.5 rounded-full border border-white/5 text-zinc-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Temporal Distortion: 0.00%</span>
                <span className="text-zinc-700">|</span>
                <span className="text-amber-400 font-bold">COAXIAL LOCK</span>
              </div>

              {/* Google Authentication Control */}
              {authLoading ? (
                <div className="h-8 w-24 bg-zinc-950/40 rounded-full animate-pulse border border-white/5" />
              ) : user ? (
                <div className="flex items-center gap-2 bg-zinc-950 border border-white/10 rounded-full pl-2 pr-3.5 py-1 text-xs">
                  {user.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      width={24}
                      height={24}
                      unoptimized
                      className="w-6 h-6 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-mono text-[10px] text-amber-500 font-bold">
                      {user.email?.[0].toUpperCase() || '🚀'}
                    </div>
                  )}
                  <div className="text-left font-sans hidden sm:block max-w-[121px] truncate">
                    <span className="block text-[10px] text-white font-medium truncate leading-none mb-0.5">
                      {user.displayName || 'Explorer'}
                    </span>
                    <span className="block text-[8px] text-zinc-500 truncate leading-none">
                      {user.email}
                    </span>
                  </div>
                  {isOsUser ? (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[8.5px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-mono font-bold ml-1.5 select-none uppercase tracking-wider">
                      OS SECURED
                    </span>
                  ) : (
                    <button
                      onClick={handleSignOut}
                      className="p-1 text-zinc-400 hover:text-red-400 rounded-full hover:bg-white/5 transition cursor-pointer ml-1"
                      title="Disconnect Spatio-Chrono Feed"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600/20 to-amber-400/20 hover:from-amber-600/30 hover:to-amber-400/30 border border-amber-500/30 text-amber-300 px-3.5 py-1.5 rounded-full text-xs font-mono select-none hover:text-white hover:border-amber-400 transition duration-300 active:scale-95 cursor-pointer animate-in fade-in"
                >
                  <LogIn className="w-3.5 h-3.5 text-amber-500" />
                  <span>CONNECT_FEED</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* 2. CHRONO presets header dashboard */}
        <div className="bg-zinc-950/40 border-b border-white/5 py-3.5 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-[10.5px] font-mono font-bold uppercase text-zinc-400 tracking-wider">
                Primary Temporal Coordinate Presets:
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'alexandria', label: 'Egypt 285 BC', era: 'Classical Antiquity' },
                { id: 'feudal', label: 'England 1215 AD', era: 'Middle Ages' },
                { id: 'musa', label: 'Mali Empire 1312 AD', era: 'Mali Golden Age' },
                { id: 'apollo', label: 'USA 1969 AD', era: 'Space Age' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleEraSelection(preset.id)}
                  className="px-3.5 py-1.5 rounded-xl text-[10.5px] font-mono border border-white/5 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white transition cursor-pointer active:scale-[0.98] flex items-center gap-1.5"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/70" />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-12">
          {/* UPPER GRID SECTION: TELEPORTATION SYSTEM DECK */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* LEFT: Temporal Warping controls - span 5 */}
            <div className="lg:col-span-5 bg-[#0e0e12] border border-white/5 rounded-2xl p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-white font-serif italic">
                      Teleportation Calibration Pad
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                      Select your target era boundaries and input geopolitical locations.
                    </p>
                  </div>
                </div>

                {/* Year Select & Interactive Sliders */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                      — Target Temporal Epoch
                    </span>
                    <span className="text-xs text-amber-400 font-extrabold font-serif italic">
                      {selectedYear < 0 ? `${Math.abs(selectedYear)} B.C.` : `${selectedYear} A.D.`}
                    </span>
                  </div>

                  {/* Visual slider */}
                  <input
                    type="range"
                    min="-1000"
                    max="2026"
                    value={selectedYear}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSelectedYear(val);
                      // Dynamically reset era name based on slider year
                      if (val < -100) {
                        setEraName('Classical Antiquity');
                        setEraDescription('Epoch of monuments, philosophy, and foundational codes');
                      } else if (val >= -100 && val < 1000) {
                        setEraName('Pre-Medieval Era');
                        setEraDescription('Decentralized local migration and evolving systems');
                      } else if (val >= 1000 && val < 1500) {
                        setEraName('Middle Ages & Renaissance');
                        setEraDescription(
                          'Coronations, global transit charts, and regional guilds'
                        );
                      } else {
                        setEraName('Modern & Technological Era');
                        setEraDescription(
                          'Industrialisation, scientific breakthrough, and space leaps'
                        );
                      }
                    }}
                    onMouseUp={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      handleMapSelectionTrigger(selectedLat, selectedLng, val);
                    }}
                    onTouchEnd={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      handleMapSelectionTrigger(selectedLat, selectedLng, val);
                    }}
                    className="w-full accent-amber-500 h-1 bg-zinc-850 rounded-lg cursor-ew-resize appearance-none"
                  />

                  <div className="flex justify-between text-[8px] font-mono text-zinc-650 pt-1">
                    <span>1000 B.C.</span>
                    <span>1 A.D.</span>
                    <span>1000 A.D.</span>
                    <span>2026 A.D.</span>
                  </div>
                </div>

                {/* Exact Location Text Bar input */}
                <div className="space-y-2 relative" id="destination-input-group">
                  <label className="text-[10px] font-mono font-bold text-zinc-450 uppercase tracking-widest block">
                    — Destination Landmark / Capital
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={locationNameInput}
                      onChange={(e) => setLocationNameInput(e.target.value)}
                      onFocus={() => {
                        if (visibleSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 hover:border-white/15 focus:border-amber-400 focus:outline-none text-xs text-zinc-150 transition pr-10"
                      placeholder="e.g. Rome, Italy"
                    />
                    <div className="absolute right-3.5 top-3 flex items-center gap-1.5">
                      {isSearchingSuggestions ? (
                        <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                    </div>
                  </div>

                  {/* Suggestions List Dropdown */}
                  {visibleShowSuggestions && visibleSuggestions.length > 0 && (
                    <div className="absolute top-[68px] left-0 right-0 z-50 bg-[#0c0c10]/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.9)] overflow-hidden max-h-60 overflow-y-auto divide-y divide-white/5 animate-in fade-in slide-in-from-top-1 duration-150">
                      {visibleSuggestions.map((item, idx) => (
                        <button
                          key={item.place_id || idx}
                          type="button"
                          onClick={() => handleSelectSuggestion(item)}
                          className="w-full text-left px-4 py-2.5 text-xs hover:bg-amber-500/15 hover:text-white transition flex items-center justify-between group gap-2"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate text-zinc-200 group-hover:text-amber-300 font-sans">
                              {item.description}
                            </span>
                          </div>
                          <span className="text-[8px] font-mono uppercase bg-zinc-900 border border-white/5 text-zinc-500 px-1.5 py-0.5 rounded shrink-0 group-hover:border-amber-500/20 group-hover:text-amber-400 transition-all">
                            {item.isRealGoogle ? 'Google Map' : 'Codex AI'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom latitude longitude manual boxes */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <span className="text-[8.5px] uppercase font-mono text-zinc-500">
                      Spatial Lat Coordinate
                    </span>
                    <input
                      type="number"
                      step="0.001"
                      value={selectedLat}
                      onChange={(e) => setSelectedLat(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 font-mono text-xs text-zinc-300 border border-white/5 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8.5px] uppercase font-mono text-zinc-500">
                      Spatial Lng Coordinate
                    </span>
                    <input
                      type="number"
                      step="0.001"
                      value={selectedLng}
                      onChange={(e) => setSelectedLng(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 font-mono text-xs text-zinc-300 border border-white/5 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Simulated actions buttons deck */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="bg-zinc-950/70 p-4 rounded-xl border border-white/5 space-y-1 text-xs">
                  <span className="text-[9.5px] font-mono font-bold text-amber-500 uppercase tracking-widest block">
                    💫 Active Temporal Calibration Target:
                  </span>
                  <p className="text-white font-serif font-bold italic leading-tight">
                    {locationNameInput} (
                    {selectedYear < 0 ? `${Math.abs(selectedYear)} BC` : `${selectedYear} AD`})
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    Era: <span className="text-zinc-200 font-mono">{eraName}</span> &ldquo;
                    {eraDescription}&rdquo;
                  </p>
                </div>

                <div className="flex gap-2.5">
                  {/* Save custom timeline */}
                  <button
                    onClick={() => {
                      const journeyTitle = `Warp to ${locationNameInput.split(',')[0]} (${selectedYear < 0 ? `${Math.abs(selectedYear)} BC` : `${selectedYear} AD`})`;
                      const isBookmarked = savedJourneys.some((sj) => sj.title === journeyTitle);
                      if (isBookmarked) {
                        const existingItem = savedJourneys.find((sj) => sj.title === journeyTitle);
                        if (existingItem) handleDeleteJourney(existingItem.id);
                      } else {
                        handleSaveJourney(journeyTitle, 'custom', {
                          year: selectedYear,
                          locationName: locationNameInput,
                          latitude: selectedLat,
                          longitude: selectedLng,
                          eraName: eraName,
                          eraDescription: eraDescription,
                          description: `Spatio-temporal alignment to coordinates [${selectedLat.toFixed(3)}, ${selectedLng.toFixed(3)}] within the ${eraName}.`,
                        });
                      }
                    }}
                    disabled={isSaving}
                    className={`px-3 py-3 border rounded-xl transition cursor-pointer flex items-center justify-center disabled:opacity-50 shrink-0 ${
                      savedJourneys.some(
                        (sj) =>
                          sj.title ===
                          `Warp to ${locationNameInput.split(',')[0]} (${selectedYear < 0 ? `${Math.abs(selectedYear)} BC` : `${selectedYear} AD`})`
                      )
                        ? 'border-amber-400/50 bg-amber-500/20 text-amber-300 animate-pulse'
                        : 'border-white/10 hover:border-amber-500/30 text-zinc-300 hover:text-white bg-zinc-950 hover:bg-zinc-900 md:px-4'
                    }`}
                    title="Bookmark active coordinates setup"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${savedJourneys.some((sj) => sj.title === `Warp to ${locationNameInput.split(',')[0]} (${selectedYear < 0 ? `${Math.abs(selectedYear)} BC` : `${selectedYear} AD`})`) ? 'fill-amber-400 text-amber-300' : 'text-zinc-450'}`}
                    />
                  </button>

                  {/* Generate local landmark pins */}
                  <button
                    onClick={() => handleScanForPins(selectedLat, selectedLng)}
                    disabled={isSearchingPins}
                    className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-white/10 rounded-xl text-[10px] font-mono tracking-widest uppercase transition duration-300 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {isSearchingPins ? 'SCANNING MAP...' : 'LOCATE_PINS'}
                  </button>

                  {/* Warp trigger */}
                  <button
                    onClick={handleTemporalWarp}
                    disabled={sensoryLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-black rounded-xl text-[10px] font-extrabold font-mono tracking-widest uppercase transition duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_4px_16px_rgba(245,158,11,0.15)] disabled:opacity-45"
                  >
                    <Play className="w-3.5 h-3.5 fill-black animate-pulse" />
                    {sensoryLoading ? 'WARPING...' : 'TEMPORAL_WARP'}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: Stylized interactive map grid - span 7 */}
            <div className="lg:col-span-7 bg-[#0e0e12] border border-white/5 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <h4 className="text-xs font-mono font-bold tracking-widest uppercase text-white font-serif italic">
                    Temporal Geographic Radar
                  </h4>
                </div>
                <p className="text-[10.5px] text-zinc-400 font-sans">
                  Click map to lock custom coordinates or explore curated glowing landmark pins.
                </p>
              </div>

              <InteractiveMap
                year={selectedYear}
                selectedLat={selectedLat}
                selectedLng={selectedLng}
                onMapClick={(lat, lng) => {
                  handleMapSelectionTrigger(lat, lng, selectedYear);
                }}
                pins={sessionPins}
                activePinIndex={activePinIndex}
                onPinClick={selectPinHandler}
              />

              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 bg-zinc-950 p-3 rounded-xl border border-white/5 gap-2">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    Found {sessionPins.length} historic sites matching active epoch. Click pins to
                    activate full details.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE SECTION: HISTORICAL SOURCE CODEX DISPLAY PANEL (CRITICAL DETAILED VIEW SCREEN REQ) */}
          <AnimatePresence mode="wait">
            {detailedEvent && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="bg-[#0c0c10] border-2 border-amber-500/30 rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-[0_8px_32px_rgba(245,158,11,0.06)]"
                id="event-codex-overlay"
              >
                {/* Golden holographic accent borders */}
                <div className="absolute top-0 left-0 w-32 h-1 bg-gradient-to-r from-amber-500 to-transparent" />
                <div className="absolute top-0 left-0 w-1 h-32 bg-gradient-to-b from-amber-500 to-transparent" />
                <div className="absolute bottom-0 right-0 w-32 h-1 bg-gradient-to-l from-amber-500 to-transparent" />
                <div className="absolute bottom-0 right-0 w-1 h-32 bg-gradient-to-t from-amber-500 to-transparent" />

                {/* Close Button */}
                <button
                  onClick={() => setDetailedEvent(null)}
                  className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition cursor-pointer"
                  title="Return to exploration"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-6">
                  {/* Visual Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-amber-400">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-[10px] font-mono tracking-widest font-extrabold uppercase">
                          TEMPORAL DOCUMENT CODEX
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-white font-serif italic tracking-tight py-1">
                        {detailedEvent.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 text-[10.5px] font-mono text-zinc-400 pt-1">
                        <span className="px-2.5 py-1 bg-amber-500/10 rounded border border-amber-500/20 text-amber-400 font-bold">
                          🕒{' '}
                          {detailedEvent.year
                            ? parseInt(detailedEvent.year) < 0
                              ? `${Math.abs(parseInt(detailedEvent.year))} B.C.`
                              : `${detailedEvent.year} A.D.`
                            : selectedYear}
                        </span>
                        <span>•</span>
                        <span>🌐 Latitude: {detailedEvent.latitude?.toFixed(4)}°N</span>
                        <span>•</span>
                        <span>Longitude: {detailedEvent.longitude?.toFixed(4)}°E</span>
                      </div>
                    </div>

                    {/* Actions & Bookmarking Area */}
                    <div className="self-start lg:self-center flex flex-wrap items-center gap-2.5 shrink-0">
                      {/* Golden bookmark button with exact pixel matching */}
                      <button
                        onClick={() => {
                          const isBookmarked = savedJourneys.some(
                            (sj) => sj.title === detailedEvent.title
                          );
                          if (isBookmarked) {
                            const existingItem = savedJourneys.find(
                              (sj) => sj.title === detailedEvent.title
                            );
                            if (existingItem) {
                              handleDeleteJourney(existingItem.id);
                            }
                          } else {
                            handleSaveJourney(detailedEvent.title, 'preset', {
                              year: detailedEvent.year,
                              locationName: locationNameInput,
                              latitude: detailedEvent.latitude || selectedLat,
                              longitude: detailedEvent.longitude || selectedLng,
                              eraName: eraName,
                              eraDescription: eraDescription,
                              description: detailedEvent.description,
                            });
                          }
                        }}
                        disabled={isSaving}
                        className={`px-4 py-2 rounded-xl border text-[10px] font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 h-[38px] ${
                          savedJourneys.some((sj) => sj.title === detailedEvent.title)
                            ? 'border-amber-400/40 bg-amber-500/10 text-amber-300'
                            : 'border-white/5 hover:border-amber-500/30 text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900'
                        }`}
                        title="Bookmark event into saved journeys"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${savedJourneys.some((sj) => sj.title === detailedEvent.title) ? 'fill-amber-400 text-amber-300' : 'text-zinc-500'}`}
                        />
                        <span>
                          {savedJourneys.some((sj) => sj.title === detailedEvent.title)
                            ? 'BOOKMARKED'
                            : 'BOOKMARK'}
                        </span>
                      </button>

                      {/* Export to PDF Button */}
                      <button
                        onClick={() => handleExportPDF()}
                        className="px-4 py-2 rounded-xl border border-cyan-500/20 hover:border-cyan-400/40 bg-cyan-950/30 hover:bg-cyan-950/80 text-cyan-400 hover:text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 h-[38px]"
                        title="Export historical event details and sensory atmosphere logs as PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>EXPORT PDF</span>
                      </button>

                      {/* Curated status tag */}
                      <div className="flex items-center gap-2 bg-zinc-950 px-4 py-2 rounded-xl border border-white/5 h-[38px]">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <div className="text-left font-mono">
                          <span className="block text-[8px] text-zinc-500 tracking-wide uppercase leading-none font-sans">
                            Chrono Accuracy
                          </span>
                          <span className="text-white text-[11px] font-bold">CALIBRATED LOGS</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main details body: Split columns (Description left, figures right) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Comprehensive analysis description (7 cols) */}
                    <div className="lg:col-span-8 space-y-4">
                      <h4 className="text-[10px] font-mono font-bold uppercase text-zinc-500 tracking-widest block font-sans">
                        — Narrative Insight & Geopolitical Context
                      </h4>
                      <p className="text-sm sm:text-base text-zinc-350 leading-relaxed font-serif italic font-medium">
                        &ldquo;
                        {detailedEvent.description ||
                          'Historical data stream is currently being processed by the local coaxial teleport system. Calibrate temporal presets to download full transcript logs.'}
                        &rdquo;
                      </p>

                      {/* Precise Location context block */}
                      {detailedEvent.location && (
                        <div className="p-3.5 bg-zinc-950/40 rounded-xl border border-white/5 flex items-center gap-3 mt-4">
                          <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                          <div className="text-left">
                            <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase block tracking-wider leading-none">
                              Descriptive Location Site
                            </span>
                            <span className="text-xs text-zinc-305 font-sans">
                              {detailedEvent.location}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Causes and Consequences Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* Causes */}
                        <div className="p-4 rounded-xl bg-[#0e0e12]/80 border border-white/5 space-y-2 hover:border-amber-500/10 transition">
                          <div className="flex items-center gap-2 text-amber-500">
                            <History className="w-3.5 h-3.5" />
                            <h5 className="text-[10px] font-mono font-bold uppercase tracking-widest">
                              Primary Historical Causes
                            </h5>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            {detailedEvent.causes ||
                              'Underlying socio-political drivers, resource needs, and key decisions led to the convergence of conditions for this event.'}
                          </p>
                        </div>

                        {/* Consequences */}
                        <div className="p-4 rounded-xl bg-[#0e0e12]/80 border border-white/5 space-y-2 hover:border-amber-400/15 transition">
                          <div className="flex items-center gap-2 text-amber-400 font-medium">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <h5 className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-300">
                              Immediate Consequences
                            </h5>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            {detailedEvent.consequences ||
                              'Immediate shifts in power, local governance standards, and lasting socio-cultural blueprints resulted in centuries of ripples.'}
                          </p>
                        </div>
                      </div>

                      {/* Quick interactive factbox */}
                      <div className="p-4 bg-zinc-950/60 rounded-xl border border-white/5 flex items-start gap-3 mt-6">
                        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          To study this site, activate the{' '}
                          <a
                            href="#ar-integration"
                            className="text-amber-400 underline font-semibold"
                          >
                            AR spatial lens
                          </a>{' '}
                          in the lower quadrant. The model will layer simulated visual remnants of
                          this historic landmark directly on top of your live webcam field.
                        </p>
                      </div>
                    </div>

                    {/* Right Column: Key Figures, Links, Media sources (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                      {/* Key Figures involved */}
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 tracking-widest block">
                          — Key Historical Figures & Catalysts
                        </span>
                        <div className="space-y-2">
                          {detailedEvent.keyFigures &&
                            detailedEvent.keyFigures.map((fig, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-zinc-950 rounded-xl border border-white/5 flex items-center gap-3 transition hover:border-amber-500/20"
                              >
                                <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-400/20 flex items-center justify-center font-mono text-xs font-bold text-amber-400">
                                  <Users className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                  <span className="text-xs font-bold text-white block">{fig}</span>
                                  <span className="text-[9px] text-zinc-450 font-mono">
                                    Epoch Influencer
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Academic Sources and Digital Media Archives */}
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 tracking-widest block">
                          — Relevant Historical Sources & Libraries
                        </span>
                        <div className="space-y-2">
                          {detailedEvent.sources &&
                            detailedEvent.sources.map((src, idx) => (
                              <a
                                key={idx}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 bg-zinc-950/80 hover:bg-zinc-950 border border-white/5 hover:border-amber-400/20 rounded-xl text-[10.5px] font-mono text-zinc-300 hover:text-amber-400 transition flex items-center justify-between group"
                              >
                                <span className="truncate max-w-[200px]">{src.name}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-zinc-450 group-hover:text-amber-400 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                              </a>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* REPLICATED TIMELINE DISPLAY - IMMERSIVE TIMELINE NAVIGATOR */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-white font-serif italic">
                  Active Temporal Chronology Timeline
                </h3>
              </div>
              <p className="text-[11px] text-zinc-400">
                Traverse key historic cycles. Click any epoch node to center coordinates and invoke
                local historical logs.
              </p>
            </div>

            {/* Timeline Deck Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CURATED_EVENTS.map((item, idx) => {
                const isActive = detailedEvent?.title === item.title;
                return (
                  <div
                    key={idx}
                    onClick={() => selectPinHandler(idx)}
                    className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between h-[120px] relative overflow-hidden group ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-400/40'
                        : 'bg-[#0e0e12] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono uppercase bg-amber-500/10 border border-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded">
                        {item.year < 0 ? `${Math.abs(item.year)} B.C.` : `${item.year} A.D.`}
                      </span>
                      <h5 className="text-xs font-serif italic font-extrabold text-white mt-2 group-hover:text-amber-300 transition-colors truncate">
                        {item.title}
                      </h5>
                    </div>

                    <div className="flex justify-between items-center text-[8.5px] font-mono text-zinc-500 pt-2 border-t border-white/5">
                      <span>{item.keyFigures[0].split(' ')[0]}..</span>
                      <span className="flex items-center gap-1 group-hover:text-amber-400 transition-colors">
                        LOAD_CODEX <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SAVED JOURNEYS SECTION */}
          <section className="space-y-4 pt-6 border-t border-white/5 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-500 animate-pulse" />
                <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-white font-serif italic">
                  Saved Journeys & Spatio-Chrono Bookmarks
                </h3>
              </div>
              <p className="text-[10.5px] text-zinc-400 font-sans">
                Safely persistent on decentralized database hubs. Access and warp instantly.
              </p>
            </div>

            {user && savedJourneys.length > 0 && (
              <div className="relative max-w-md w-full mb-2">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Search className="w-3.5 h-3.5 text-zinc-500" />
                </span>
                <input
                  type="text"
                  placeholder="Filter bookmarks by title, location, era..."
                  value={savedJourneysSearchQuery}
                  onChange={(e) => setSavedJourneysSearchQuery(e.target.value)}
                  className="w-full pl-9.5 pr-8 py-2 rounded-xl bg-zinc-950 border border-white/10 hover:border-white/20 focus:border-amber-400 focus:outline-none text-xs text-zinc-205 placeholder-zinc-650 transition"
                />
                {savedJourneysSearchQuery && (
                  <button
                    onClick={() => setSavedJourneysSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white"
                    title="Clear search filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {!user ? (
              <div className="p-8 rounded-2xl border border-white/5 bg-[#0e0e12] text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-950 border border-white/5 mx-auto flex items-center justify-center text-zinc-500">
                  <Bookmark className="w-5 h-5" />
                </div>
                <p className="text-zinc-400 text-xs max-w-sm mx-auto font-sans leading-relaxed">
                  Connect your spatio-chrono exploration feed to persist and load your custom
                  timelines or curated moments.
                </p>
                <button
                  onClick={handleGoogleSignIn}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600/20 to-amber-400/20 hover:from-amber-600/30 hover:to-amber-400/30 border border-amber-500/30 text-amber-300 text-[10px] font-mono tracking-wider uppercase rounded-xl transition cursor-pointer select-none active:scale-95 duration-150"
                >
                  Sign In with Google
                </button>
              </div>
            ) : savedJourneys.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-white/10 bg-[#0e0e12]/30 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-zinc-950 border border-white/5 mx-auto flex items-center justify-center text-zinc-650">
                  <Bookmark className="w-4.5 h-4.5 text-zinc-600" />
                </div>
                <p className="text-zinc-550 text-xs font-sans">
                  You have no bookmarked voyages in your index yet.
                </p>
                <p className="text-zinc-650 text-[10px] font-mono">
                  Click bookmark star controls on calibration pads or documents codex to save
                  journeys.
                </p>
              </div>
            ) : filteredSavedJourneys.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-white/10 bg-[#0e0e12]/30 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-zinc-950 border border-white/5 mx-auto flex items-center justify-center text-zinc-650">
                  <Search className="w-4.5 h-4.5 text-zinc-600" />
                </div>
                <p className="text-zinc-550 text-xs font-sans">
                  No bookmarked voyages matched your search filter.
                </p>
                <p className="text-zinc-650 text-[10px] font-mono">
                  Try searching with a different title, location context, or historical era name.
                </p>
                <button
                  onClick={() => setSavedJourneysSearchQuery('')}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-350 text-[9px] uppercase tracking-wider rounded-lg transition"
                >
                  Clear Search Filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredSavedJourneys.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className="p-4 rounded-xl border border-white/5 bg-[#0e0e12] hover:border-amber-500/30 transition-all duration-300 relative group flex flex-col justify-between h-[135px]"
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[8.5px] font-mono uppercase bg-amber-500/10 border border-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded leading-none shrink-0">
                            {item.year < 0 ? `${Math.abs(item.year)} B.C.` : `${item.year} A.D.`}
                          </span>
                          <span className="text-[7.5px] font-mono uppercase text-zinc-500 tracking-wider">
                            {item.type}
                          </span>
                        </div>
                        <h5 className="text-xs font-serif font-extrabold text-white mt-1.5 line-clamp-2 pr-4 group-hover:text-amber-300 transition-colors leading-tight">
                          {item.title}
                        </h5>
                        <span className="text-[9.5px] text-zinc-500 font-mono block truncate">
                          📍 {item.locationName}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[8.5px] font-mono text-zinc-450 pt-1.5 border-t border-white/5 gap-2 mt-auto">
                        <button
                          onClick={() => {
                            setSelectedYear(item.year);
                            setSelectedLat(item.latitude);
                            setSelectedLng(item.longitude);
                            setLocationNameInput(item.locationName);
                            setEraName(item.eraName || 'Custom Era');
                            setEraDescription(item.eraDescription || '');
                            setDetailedEvent({
                              title: item.title,
                              year: item.year,
                              latitude: item.latitude,
                              longitude: item.longitude,
                              description: item.description || '',
                              keyFigures: item.keyFigures || ['Custom Explorer'],
                              dateFormatted:
                                item.year < 0 ? `${Math.abs(item.year)} B.C.` : `${item.year} A.D.`,
                              sources: item.sources || [],
                            });
                          }}
                          className="flex items-center gap-1 text-zinc-400 hover:text-amber-400 cursor-pointer text-left transition"
                        >
                          TELEPORT_TO{' '}
                          <ChevronRight className="w-3 h-3 text-amber-455 animate-pulse" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteJourney(item.id);
                          }}
                          className="p-1 text-zinc-600 hover:text-red-400 hover:bg-white/5 rounded transition cursor-pointer"
                          title="Delete Journey Bookmark"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* LOWER SPLIT GRID SECTION: AI INTEGRATION LAYER */}
          <div
            id="ar-integration"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch pt-4"
          >
            {/* LEFT: Complete AR space hologram layers AROverlay */}
            <div className="bg-[#0e0e12] border border-white/5 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-mono font-bold tracking-widest uppercase text-white font-serif italic">
                    AR Spatial Hologram Layer
                  </h4>
                </div>
                <p className="text-[10.5px] text-zinc-400 font-sans">
                  Simulate spatial bounding wireframes aligned to locked era targets.
                </p>
              </div>

              <AROverlay eraName={eraName} locationName={locationNameInput} year={selectedYear} />
            </div>

            {/* RIGHT: Sensory Insight travel logs */}
            <div className="bg-[#0e0e12] border border-white/5 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-mono font-bold tracking-widest uppercase text-white font-serif italic">
                    Temporal Sensory Insight Log
                  </h4>
                </div>
                <p className="text-[10.5px] text-zinc-400 font-sans">
                  AI reconstruction of historic atmospheres, people, sounds, and events.
                </p>
              </div>

              {sensoryLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                  <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
                    SYNTHESIZING ATMOSPHERE RECORDS...
                  </span>
                </div>
              ) : sensoryResult ? (
                <div className="flex-1 select-text space-y-5">
                  {/* Title & atmospheric description */}
                  <div className="p-4 bg-zinc-950 rounded-xl border-l-2 border-amber-500 space-y-1">
                    <span className="text-[9px] font-mono uppercase text-amber-500 tracking-wider">
                      RESONANCE FIELD ACTIVE
                    </span>
                    <h5 className="text-sm font-bold font-serif italic text-white">
                      {sensoryResult.sensoryTitle}
                    </h5>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans pt-1">
                      {sensoryResult.sensoryDescription}
                    </p>
                  </div>

                  {/* Subgrid: figures & occurrences */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Local prominent figures */}
                    <div className="space-y-2">
                      <span className="text-[9.5px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">
                        — Verified Figures Present
                      </span>
                      <div className="space-y-2">
                        {sensoryResult.keyFigures.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-zinc-950/60 rounded-lg border border-white/5"
                          >
                            <span className="text-xs font-bold text-white block">{item.name}</span>
                            <span className="text-[9px] text-amber-500 font-mono tracking-wider block">
                              {item.role}
                            </span>
                            <p className="text-[10px] text-zinc-400 leading-relaxed pt-1 font-sans">
                              {item.bio}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Occurrences events */}
                    <div className="space-y-2">
                      <span className="text-[9.5px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">
                        — Significant Local Events
                      </span>
                      <div className="space-y-2">
                        {sensoryResult.virtualEvents.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-zinc-950/60 rounded-lg border border-white/5 space-y-0.5"
                          >
                            <span className="text-xs font-bold text-white block truncate">
                              {item.title}
                            </span>
                            <p className="text-[10px] text-zinc-400 leading-snug font-sans">
                              {item.context}
                            </p>
                            <span className="text-[8px] text-zinc-550 font-mono uppercase block pt-1">
                              Source: {item.reference}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Ambient Tone frequency rate */}
                  <div className="bg-zinc-950 p-3 rounded-lg border border-white/5 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <History className="w-3.5 h-3.5 text-zinc-500" />
                      <span>
                        Calculated Ambient Audio: &ldquo;{sensoryResult.ambientToneRate.description}
                        &rdquo;
                      </span>
                    </div>
                    <span className="text-amber-500 font-bold tracking-wider">
                      {sensoryResult.ambientToneRate.frequency}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <Compass className="w-10 h-10 text-amber-500/40 mb-3" />
                  <span className="text-xs text-zinc-400 font-mono">TEMPORAL LOG EMPTY</span>
                  <p className="text-[10px] text-zinc-505 max-w-sm mt-1">
                    Trigger WARP options to begin downloading sensory insights for specified
                    space-time targets.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM SECTION: SPECULATIVE FORESIGHT TRAJECTORY FORECASTER (PRE-LOADED OR DYNAMIC) */}
          <section className="space-y-4 pt-4 border-t border-white/5 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
              <div className="space-y-0.5">
                <span className="text-[12px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-1.5 font-serif italic">
                  🔮 Speculative Future Trajectory Forecaster
                </span>
                <p className="text-[11px] text-zinc-400 font-sans mt-0.5 max-w-2xl text-left">
                  Simulate and extrapolate long-term socio-technological trends of{' '}
                  {locationNameInput.split(',')[0]} relative to its {eraName} (
                  {selectedYear < 0 ? `${Math.abs(selectedYear)} B.C.` : `${selectedYear} A.D.`})
                  historical base.
                </p>
              </div>
            </div>

            <FutureForecast
              forecastData={forecastData}
              selectedEraName={eraName}
              selectedLocation={locationNameInput}
              selectedDate={
                selectedYear < 0 ? `${Math.abs(selectedYear)} B.C.` : `${selectedYear} A.D.`
              }
              techLevel={techLevel}
              setTechLevel={setTechLevel}
              societalChange={societalChange}
              setSocietalChange={setSocietalChange}
              environmentalShift={environmentalShift}
              setEnvironmentalShift={setEnvironmentalShift}
              timeHorizon={timeHorizon}
              setTimeHorizon={setTimeHorizon}
              customCatalyst={customCatalyst}
              setCustomCatalyst={setCustomCatalyst}
              currentTrends={currentTrends}
              setCurrentTrends={setCurrentTrends}
              forecastTopic={forecastTopicSelect}
              setForecastTopic={setForecastTopicSelect}
              historicalEventTypes={historicalEventTypes}
              setHistoricalEventTypes={setHistoricalEventTypes}
              forecastLoading={forecastLoading}
              onSimulate={() => handleFutureForecast()}
            />
          </section>
        </main>

        {/* 4. HISTORICAL COAXIAL SCAN EVENTS POPUP MODAL */}
        <AnimatePresence>
          {isHistoricalPopupOpen && (
            <div
              className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto"
              onClick={() => setIsHistoricalPopupOpen(false)}
              id="historical-events-portal-popup"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 180 }}
                className="bg-[#0c0c10] border-2 border-amber-500/40 rounded-2xl max-w-4xl w-full relative overflow-hidden shadow-[0_24px_64px_rgba(245,158,11,0.18)] flex flex-col max-h-[90vh] md:h-[620px]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Holographic accent stripes */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-pulse" />

                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between bg-black/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                      <Compass className="w-4 h-4 animate-spin-slow" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold tracking-widest text-white uppercase font-sans leading-none flex items-center gap-1.5">
                        Spatio-Chrono Radar Lock
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 font-mono">
                          SCANNING
                        </span>
                      </h3>
                      <p className="text-[9.5px] text-zinc-400 font-mono mt-1 text-left">
                        Coordinates: {selectedLat.toFixed(3)}°N, {selectedLng.toFixed(3)}°E at{' '}
                        {selectedYear < 0
                          ? `${Math.abs(selectedYear)} B.C.`
                          : `${selectedYear} A.D.`}
                      </p>
                    </div>
                  </div>

                  {/* Close Trigger */}
                  <button
                    onClick={() => setIsHistoricalPopupOpen(false)}
                    className="p-1.5 rounded-full hover:bg-white/5 text-zinc-550 hover:text-white transition cursor-pointer"
                    title="Close spacio-temporal feed"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Modal Body Container */}
                <div className="flex-1 overflow-y-auto min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/5">
                  {popupLoading ? (
                    /* Loading Futuristic Hologram HUD */
                    <div className="flex-grow flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-500/25 animate-spin duration-[6s]" />
                        <div className="absolute inset-2 w-12 h-12 rounded-full border-t-2 border-r-2 border-amber-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-1.5 max-w-sm">
                        <span className="text-[10px] font-mono tracking-widest text-amber-500 font-bold uppercase animate-pulse block">
                          COAXIAL FEED DECIPHERING
                        </span>
                        <p className="text-xs text-zinc-450 font-sans">
                          Querying the cosmic local record database registers back in{' '}
                          {selectedYear < 0
                            ? `${Math.abs(selectedYear)} B.C.`
                            : `${selectedYear} A.D.`}
                          ...
                        </p>
                      </div>
                    </div>
                  ) : popupEvents.length === 0 ? (
                    /* No key historical events found */
                    <div className="flex-grow flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full border border-white/5 bg-zinc-950 flex items-center justify-center text-zinc-650">
                        <Info className="w-5 h-5" />
                      </div>
                      <span className="text-xs text-zinc-400 font-mono uppercase tracking-wider block font-bold">
                        TEMPORAL SIGNAL EMPTY
                      </span>
                      <p className="text-xs text-zinc-500 font-sans max-w-md">
                        The localized sub-grids registered zero landmark records on these exact
                        coordinates within the selected era. Drag the slider or click another
                        country map coordinate to capture localized energy spikes.
                      </p>
                    </div>
                  ) : (
                    /* Active state rendering events list & details panel */
                    <>
                      {/* LEFT LIST PANEL: 3 EVENTS FOR CURRENT COORDINATE SCAN */}
                      <div className="w-full md:w-[260px] p-4 space-y-3 shrink-0 bg-black/10 overflow-y-auto">
                        <span className="text-[9px] font-mono font-bold uppercase text-zinc-500 tracking-wider block text-left">
                          Discovered Chronicles ({popupEvents.length})
                        </span>
                        <div className="space-y-2.5">
                          {popupEvents.map((ev, i) => {
                            const isActive = i === activePopupEventIndex;
                            return (
                              <button
                                key={i}
                                onClick={() => setActivePopupEventIndex(i)}
                                className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col gap-1 cursor-pointer ${
                                  isActive
                                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-200'
                                    : 'bg-zinc-955/40 border-white/5 hover:border-white/10 text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                <div className="flex justify-between items-center w-full">
                                  <span
                                    className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${isActive ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-zinc-900 text-zinc-500'}`}
                                  >
                                    {ev.year
                                      ? parseInt(ev.year) < 0
                                        ? `${Math.abs(parseInt(ev.year))} BC`
                                        : `${ev.year} AD`
                                      : selectedYear}
                                  </span>
                                </div>
                                <span className="font-bold line-clamp-2 leading-snug">
                                  {ev.title}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-sans line-clamp-1">
                                  {ev.location || 'Local Realm'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* RIGHT DETAIL PANEL: DETAILED METADATA AND VISUALS */}
                      {(() => {
                        const event = popupEvents[activePopupEventIndex];
                        if (!event) return null;
                        const imageUrl = getEventImage(event.title, Number(event.year));
                        const isBookmarked = savedJourneys.some((sj) => sj.title === event.title);

                        return (
                          <div className="flex-grow p-5 sm:p-6 overflow-y-auto flex flex-col justify-between space-y-6">
                            <div className="space-y-5">
                              {/* Visual Image Banner with dynamic overlay */}
                              <div className="relative w-full h-[140px] sm:h-[180px] rounded-xl border border-white/5 overflow-hidden group shadow-lg bg-zinc-950 shrink-0">
                                <Image
                                  src={imageUrl}
                                  alt={event.title}
                                  fill
                                  sizes="(max-width: 640px) 100vw, 480px"
                                  className="object-cover brightness-75 hover:scale-105 transition-all duration-700 select-none pointer-events-none"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                                {/* Overlay controls - Bookmark and Tag */}
                                <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between">
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] font-mono uppercase bg-amber-505 text-black px-1.5 py-0.5 rounded font-bold">
                                      {event.dateFormatted || `c. ${event.year}`}
                                    </span>
                                    <span className="text-white text-[11px] font-mono tracking-wide block mt-1 text-left">
                                      🌐 {event.location || 'Regional Realm'}
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => {
                                      if (isBookmarked) {
                                        const existingItem = savedJourneys.find(
                                          (sj) => sj.title === event.title
                                        );
                                        if (existingItem) handleDeleteJourney(existingItem.id);
                                      } else {
                                        handleSaveJourney(event.title, 'preset', {
                                          year: event.year,
                                          locationName: locationNameInput,
                                          latitude: event.latitude || selectedLat,
                                          longitude: event.longitude || selectedLng,
                                          eraName: eraName,
                                          eraDescription: eraDescription,
                                          description: event.description,
                                        });
                                      }
                                    }}
                                    disabled={isSaving}
                                    className={`px-3 py-1.5 text-[9px] font-mono uppercase rounded-lg border flex items-center gap-1 hover:scale-105 transition cursor-pointer backdrop-blur-md ${
                                      isBookmarked
                                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                                        : 'border-white/10 bg-black/40 text-zinc-300'
                                    }`}
                                  >
                                    <Star
                                      className={`w-3 h-3 ${isBookmarked ? 'fill-amber-400 text-amber-300' : 'text-zinc-405'}`}
                                    />
                                    <span>{isBookmarked ? 'BOOKMARKED' : 'BOOKMARK'}</span>
                                  </button>
                                </div>
                              </div>

                              {/* Headline */}
                              <div className="space-y-1 text-left">
                                <h4 className="text-base sm:text-lg font-black text-white font-serif tracking-tight leading-snug">
                                  {event.title}
                                </h4>
                                <p className="text-xs sm:text-sm text-zinc-350 leading-relaxed font-serif italic">
                                  &ldquo;{event.description}&rdquo;
                                </p>
                              </div>

                              {/* Causes & Consequences Block */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                                <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-white/5 space-y-1">
                                  <div className="flex items-center gap-1.5 text-amber-500">
                                    <History className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#d97706]">
                                      Historical Causes
                                    </span>
                                  </div>
                                  <p className="text-[10.5px] text-zinc-400 leading-relaxed font-sans">
                                    {event.causes ||
                                      'Underlying regional dynamics catalyzed this historical event structure.'}
                                  </p>
                                </div>

                                <div className="p-3.5 bg-zinc-955/60 rounded-xl border border-white/5 space-y-1">
                                  <div className="flex items-center gap-1.5 text-amber-400">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-amber-400">
                                      Key Consequences
                                    </span>
                                  </div>
                                  <p className="text-[10.5px] text-zinc-400 leading-relaxed font-sans">
                                    {event.consequences ||
                                      'Lasting shifts in sociopolitical balance and legacy systems.'}
                                  </p>
                                </div>
                              </div>

                              {/* Figures Involved & Sources list */}
                              <div className="space-y-3.5 pt-1.5 text-left">
                                {event.keyFigures && event.keyFigures.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[9px] font-mono font-bold uppercase text-zinc-500 tracking-wider block">
                                      — Historical Figures present:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {event.keyFigures.map((fig, idx) => (
                                        <span
                                          key={idx}
                                          className="bg-zinc-900 text-zinc-350 px-2 py-0.5 rounded text-[10px] font-mono border border-white/5 flex items-center gap-1.5"
                                        >
                                          <Users className="w-3 h-3 text-amber-500" /> {fig}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {event.sources && event.sources.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[9px] font-mono font-bold uppercase text-zinc-500 tracking-wider block">
                                      — Academic References & Archives:
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                      {event.sources.map((src, idx) => (
                                        <a
                                          key={idx}
                                          href={src.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[10px] font-mono text-amber-500/80 hover:text-amber-400 transition flex items-center gap-1 underline underline-offset-2"
                                        >
                                          {src.name} <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* FOOTER ACCENTS */}
        <footer className="border-t border-white/5 py-8 bg-black/40 text-center text-zinc-500 text-[10px] font-mono tracking-widest uppercase rounded-b-2xl">
          <p>© c. 2026 ChronoCraft Labs — Coaxial Space-Time Exploration Engines</p>
        </footer>
      </div>
    </ModuleAppShell>
  );
}
