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
  { id: "algorithms", title: "Introduction to Algorithms, 4th Edition", shortTitle: "Algorithms", course: "CSC202", price: "650", condition: "Like New", campus: "University of Cape Town (UCT)", seller: "Thabo", color: "from-[#091a37] to-[#1e3659]", accent: "#d6b047", image: "/books/algorithms.png" },
  { id: "macro", title: "Macroeconomics: Global and Southern African Perspectives", shortTitle: "Macroeconomics", course: "ECO1011", price: "340", condition: "Good", campus: "Stellenbosch University", seller: "Lerato", color: "from-[#67b522] to-[#1a795e]", accent: "#d7f36a", image: "/books/economics.png" },
  { id: "physics", title: "Physics for Scientists and Engineers", shortTitle: "Physics", course: "PHY1801", price: "450", condition: "Acceptable", campus: "Wits University", seller: "Maya", color: "from-[#303131] to-[#0e5a61]", accent: "#8ee9e4", image: "/books/math.png" },
  { id: "architecture", title: "Computer Architecture: A Quantitative Approach", shortTitle: "Computer Architecture", course: "CSC3002", price: "720", condition: "Good", campus: "University of Cape Town (UCT)", seller: "Anele", color: "from-[#f7f7e6] to-[#d7eee8]", accent: "#1593b6", image: "/books/architecture.png" },
  { id: "math", title: "Discrete Mathematics and its Applications", shortTitle: "Discrete Mathematics", course: "MAN1000", price: "480", condition: "Excellent", campus: "University of Cape Town (UCT)", seller: "Sipho", color: "from-[#474747] to-[#b31318]", accent: "#f2efe2", image: "/books/math.png" },
  { id: "java", title: "Java Foundations: Introduction to Program Design", shortTitle: "Java Foundations", course: "CSC202", price: "350", condition: "Good", campus: "University of Cape Town (UCT)", seller: "Nandi", color: "from-[#f5f3e7] to-[#51c9bf]", accent: "#e45b45", image: "/books/java.png" },
  { id: "database", title: "Database System Concepts, 7th Edition", shortTitle: "Database Systems", course: "CSC202", price: "580", condition: "Acceptable", campus: "University of Cape Town (UCT)", seller: "Kabelo", color: "from-[#081c3d] to-[#1169bd]", accent: "#62d8ff", image: "/books/database.png" },
  { id: "networks", title: "Computer Networking: A Top-Down Approach", shortTitle: "Global Networks", course: "CSC202", price: "610", condition: "Like New", campus: "University of Cape Town (UCT)", seller: "Thabo", color: "from-[#7b102c] to-[#ed1448]", accent: "#ff96bb", image: "/books/networks.png" },
];

export function getStockBookImage(courseCode: string): string {
  const match = books.find((book) => book.course === courseCode.trim().toUpperCase());
  return match?.image ?? books[0].image;
}
