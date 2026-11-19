// 받침에 따라 조사를 고른다("일정은"·"갤러리는"). 한글이 아니면 받침을 알 수 없어 뒤쪽(는/를).
export function josa(word: string, pair: "은는" | "을를"): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const isHangul = code >= 0 && code <= 11171;
  const hasBatchim = isHangul && code % 28 !== 0;
  return word + (hasBatchim ? pair[0] : pair[1]);
}
