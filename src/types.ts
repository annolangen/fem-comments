// Type Definitions
export interface Image {
  png: string;
  webp: string;
}

export interface User {
  image: Image;
  username: string;
}

export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  createdAtTs?: number; // Timestamp in milliseconds
  createdAtTextExpiration?: number; // Expiration time for the createdAt text
  score: number;
  user: User;
  replies?: Comment[];
  replyingTo?: string;
  pendingEdit?: boolean;
  pendingReply?: boolean;
}

export type VoteDirection = 1 | -1;

export interface AppState {
  comments: Comment[];
  currentUser: User;
  requestedDelete: number | null;
  nextId: number;
  newCommentContent: string;
  userVotes: Record<number, VoteDirection>;
}

export type Actions = {
  /** Finds a comment by ID and applies a mutator function to it. */
  findAndMutate: (id: number, mutator: (c: Comment) => void) => void;
  /** Updates the content of the new comment input field. */
  setNewCommentContent: (content: string) => void;
  /** Adds a new top-level comment. */
  addComment: () => void;
  /** Creates a new pending reply for a given parent comment. */
  addReply: (parentId: number) => void;
  /** Deletes a comment or reply by its ID. */
  deleteComment: (id: number) => void;
  /** Sets the ID of the comment requested for deletion to show the confirmation modal. */
  setRequestedDelete: (id: number | null) => void;
  /** Submits a pending reply, or cancels it if the content is empty. */
  submitReply: (id: number) => void;
  /** Casts a vote on a comment. */
  vote: (commentId: number, direction: VoteDirection) => void;
};

export interface State extends AppState {
  actions: Actions;
  getInitialState: () => AppState;
}
