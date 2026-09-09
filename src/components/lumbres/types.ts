export type BookStatus = 'reading' | 'want-to-read' | 'finished';
export type CoverTone = 'red' | 'olive' | 'blue' | 'cream';

export interface Book {
  /** Stable and unique across your library and recommendations. */
  id: string;
  title: string;
  author: string;
  /** Positive integer. */
  totalPages: number;
  /** Integer from 0 to totalPages. */
  currentPage: number;
  status: BookStatus;
  coverUrl?: string;
  coverTone?: CoverTone;
  /** Optional short label used only on the typographic fallback cover. */
  coverLabel?: string;
  /** ISO date; used to order the recent books. Array order is retained otherwise. */
  addedAt?: string;
}

export interface LumbresDashboardProps {
  /** The full library, not only the three books displayed in the original mockup. */
  books: readonly Book[];
  featuredBookId?: string;
  recommendation?: Book;
  /** Integer between 1 and 1000. */
  readingGoal: number;
  challengeYear: number;
  /**
   * Authoritative number completed in challengeYear. Pass the count from your
   * backend to avoid counting books finished in other years. If omitted, the
   * component counts all books whose status is 'finished'.
   */
  challengeCompletedCount?: number;
  /** Defaults to /lumbres/logo.webp. */
  logoSrc?: string;
  onProgressChange?: (bookId: string, page: number) => Promise<void> | void;
  onGoalChange?: (goal: number) => Promise<void> | void;
  /** Removing a recommendation only removes its 'want-to-read' library entry. */
  onWantToReadChange?: (book: Book, wanted: boolean) => Promise<void> | void;
  onReviewDraftSave?: (bookId: string, text: string) => Promise<void> | void;
  /** Optional app navigation. Omit to show the built-in book details dialog. */
  onOpenBook?: (book: Book) => void;
}
