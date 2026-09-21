export type Book = {
  id: string;
  title: string;
  shortTitle: string;
  course: string;
  price: string;
  condition: string;
  campus: string;
  seller: string;
  color: string;
  accent: string;
  image: string;
};

export const books: Book[] = [
  { id: "algorithms", title: "Introduction to Algorithms", shortTitle: "Algorithms", course: "CSC202", price: "650", condition: "Like New", campus: "Tshwane University of Technology (TUT)", seller: "Thabo", color: "from-[#091a37] to-[#1e3659]", accent: "#d6b047", image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=800&q=80" },
  { id: "macro", title: "Macroeconomics", shortTitle: "Macroeconomics", course: "ECO1011", price: "340", condition: "Good", campus: "Tshwane University of Technology (TUT)", seller: "Lerato", color: "from-[#67b522] to-[#1a795e]", accent: "#d7f36a", image: "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=80" },
  { id: "physics", title: "University Physics with Modern Physics", shortTitle: "University Physics", course: "PHY1801", price: "450", condition: "Acceptable", campus: "Tshwane University of Technology (TUT)", seller: "Maya", color: "from-[#303131] to-[#0e5a61]", accent: "#8ee9e4", image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80" },
  { id: "architecture", title: "Computer Organization and Design", shortTitle: "Computer Design", course: "CSC3002", price: "720", condition: "Good", campus: "Tshwane University of Technology (TUT)", seller: "Anele", color: "from-[#f7f7e6] to-[#d7eee8]", accent: "#1593b6", image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80" },
  { id: "math", title: "Calculus: Early Transcendentals", shortTitle: "Calculus", course: "MAN1000", price: "480", condition: "Excellent", campus: "Tshwane University of Technology (TUT)", seller: "Sipho", color: "from-[#474747] to-[#b31318]", accent: "#f2efe2", image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80" },
  { id: "java", title: "Java: How to Program", shortTitle: "Java", course: "CSC202", price: "350", condition: "Good", campus: "Tshwane University of Technology (TUT)", seller: "Nandi", color: "from-[#f5f3e7] to-[#51c9bf]", accent: "#e45b45", image: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=800&q=80" },
  { id: "database", title: "Database System Concepts", shortTitle: "Database Systems", course: "CSC202", price: "580", condition: "Acceptable", campus: "Tshwane University of Technology (TUT)", seller: "Kabelo", color: "from-[#081c3d] to-[#1169bd]", accent: "#62d8ff", image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80" },
  { id: "networks", title: "Computer Networking: A Top-Down Approach", shortTitle: "Computer Networks", course: "CSC202", price: "610", condition: "Like New", campus: "Tshwane University of Technology (TUT)", seller: "Thabo", color: "from-[#7b102c] to-[#ed1448]", accent: "#ff96bb", image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=800&q=80" },
  { id: "manga", title: "One Piece, Vol. 1", shortTitle: "One Piece", course: "ART102", price: "200", condition: "Good", campus: "Tshwane University of Technology (TUT)", seller: "Ken", color: "from-[#ff4d4d] to-[#b30000]", accent: "#ffff00", image: "https://upload.wikimedia.org/wikipedia/en/9/90/One_Piece%2C_Volume_61_Cover_%28Japanese%29.jpg" },
  { id: "comics", title: "The Amazing Spider-Man", shortTitle: "Spider-Man", course: "ART102", price: "300", condition: "Acceptable", campus: "Tshwane University of Technology (TUT)", seller: "Miles", color: "from-[#0033cc] to-[#001a66]", accent: "#ff0000", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQxuRQInTRW69xvQN2N86HXSQAFoeh9EOl0CAPEOqISlQ&s=10" },
  { id: "bible", title: "The Holy Bible", shortTitle: "The Holy Bible", course: "REL101", price: "150", condition: "Like New", campus: "Tshwane University of Technology (TUT)", seller: "Grace", color: "from-[#4a3728] to-[#2c1e14]", accent: "#d4af37", image: "/catalog/bible.png" },
];

export function getStockBookImage(courseCode: string): string {
  const match = books.find((book) => book.course === courseCode.trim().toUpperCase());
  return match?.image ?? books[0].image;
}
