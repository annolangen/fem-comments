export interface User {
  image: {
    png: string;
    webp: string;
  };
  username: string;
}

export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  createdAtTs?: number;
  createdAtTextExpiration?: number;
  score: number;
  replyingTo?: string;
  user: User;
  replies?: Comment[];
  pendingReply?: boolean;
  pendingEdit?: boolean;
}

export type VoteDirection = 1 | -1;

export interface AppState {
  currentUser: User;
  comments: Comment[];
  requestedDelete: number | null;
  nextId: number;
  newCommentContent: string;
  userVotes: Record<number, VoteDirection>;
}

export interface Actions {
  findAndMutate: (id: number, mutator: (c: Comment) => void) => void;
  deleteComment: (id: number) => void;
  submitReply: (id: number) => void;
  addReply: (parentId: number) => void;
  setNewCommentContent: (content: string) => void;
  addComment: () => void;
  setRequestedDelete: (id: number | null) => void;
  vote: (commentId: number, direction: VoteDirection) => void;
}

export type State = AppState & { actions: Actions };
