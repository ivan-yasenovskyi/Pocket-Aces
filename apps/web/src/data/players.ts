export interface Player {
  number: string;
  name: string;
  position: string;
  image: string;
  suit: "club" | "spade";
}

export const players: Player[] = [
  {
    number: "11",
    name: "Yasenovskyi",
    position: "Przyjmujący",
    image: "/images/player-11.webp",
    suit: "club",
  },
  {
    number: "10",
    name: "Kornienko",
    position: "Atakujący",
    image: "/images/player-10.webp",
    suit: "spade",
  },
  {
    number: "00",
    name: "Shevchenko",
    position: "Libero",
    image: "/images/player-00.webp",
    suit: "club",
  },
  {
    number: "23",
    name: "Marynenko",
    position: "Środkowy",
    image: "/images/player-23.webp",
    suit: "spade",
  },
  {
    number: "13",
    name: "Mykytyn",
    position: "Przyjmujący",
    image: "/images/player-13.webp",
    suit: "club",
  },
  {
    number: "1",
    name: "Hrutsevych",
    position: "Środkowy",
    image: "/images/player-1.webp",
    suit: "spade",
  },
  {
    number: "4",
    name: "Kotsiubailo",
    position: "Rozgrywający",
    image: "/images/player-04.png",
    suit: "club",
  },
  {
    number: "14",
    name: "Vynohradov",
    position: "Środkowy",
    image: "/images/player-14.webp",
    suit: "spade",
  },
  {
    number: "15",
    name: "Biloviets",
    position: "Rozgrywający",
    image: "/images/player-15.webp",
    suit: "club",
  },
];
