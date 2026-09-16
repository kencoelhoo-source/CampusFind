export interface DBItem {
  id: string;
  title: string;
  status: "lost" | "found" | "claimed" | "returned";
  created_at: string;
  user_id?: string;
  image_url?: string | null;
  location?: string | null;
  category?: string | null;
  held_where?: string | null;
  held_at?: string | null;
}

export interface DBClaim {
  id: string;
  item_id: string;
  user_id: string;
  message: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  verification_question: string | null;
  verification_answer: string | null;
  meeting_requested: boolean;
  meeting_details: string | null;
  appeal_message: string | null;
  items?: {
    id?: string;
    title: string;
    user_id?: string;
    status?: string;
    category?: string | null;
    location?: string | null;
    image_url?: string | null;
  };
  profiles?: { full_name: string } | null;
  created_at?: string;
}

export interface DBNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  kind?: string | null;
  related_item_id?: string | null;
  related_claim_id?: string | null;
}

export interface DashboardData {
  myItems: DBItem[];
  myClaims: DBClaim[];
  notifications: DBNotification[];
  incomingClaims: DBClaim[];
}
