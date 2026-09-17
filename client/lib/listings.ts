export type Listing = {
  id: string;
  title: string;
  courseCode: string;
  price: string;
  condition: "Like New" | "Good" | "Acceptable" | "Worn";
  description: string;
  campus: string;
  imageUrl: string | null;
  status: "ACTIVE" | "SOLD";
  createdAt: string;
  userId?: string;
  sellerEmail?: string;
  sellerPhone?: string | null;
  contactDisplayConsent?: boolean;
};
