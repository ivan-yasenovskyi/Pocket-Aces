export const panelBase =
  "rounded-[20px] p-6 shadow-[0_1px_0_rgba(2,51,107,0.06),0_18px_40px_-30px_rgba(2,51,107,0.45)]";

export const panel = `${panelBase} bg-white`;

const btnBase =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-transparent px-5 text-[15px] font-bold transition-[translate,background-color,color,border-color] duration-200 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none";

export const btnYes = `${btnBase} bg-navy text-white hover:-translate-y-0.5`;
export const btnNo = `${btnBase} border-[#b9d9ee] bg-white text-navy hover:border-navy`;
export const btnGhost =
  "inline-flex min-h-11 cursor-pointer items-center px-1.5 text-[15px] font-bold text-mid underline underline-offset-3";
