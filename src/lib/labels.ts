import type { Part } from './shape';

// 이름표: 부분 이름과 한 줄 설명
export const LABEL: Record<Part, { name: string; desc: string }> = {
  meoricho: { name: '머리초', desc: '보·도리 같은 부재의 양 끝에 그리는 가장 중요한 문양' },
  hwi: { name: '휘', desc: '머리초 바깥을 감싸는 꽃잎 모양 띠. 겹이 많을수록 격이 높다' },
  juhwa: { name: '주화', desc: '머리초 가운데의 큰 꽃. 주로 연꽃이다' },
  seongnyudong: { name: '석류동', desc: '주화 한가운데의 석류. 많은 씨앗처럼 번성을 빈다' },
  banjuhwa: { name: '반주화', desc: '가장자리에 반만 보이게 그린 꽃' },
  gyepung: { name: '계풍', desc: '양 끝 머리초 사이의 가운데 부분' },
  geummun: { name: '금문', desc: '비단 무늬처럼 되풀이되는 기하 문양' },
  tedu: { name: '먹선·분선', desc: '색 띠 사이를 가르는 검은 선과 흰 선' },
};

export const BITNEOGI = { name: '빛넣기', desc: '같은 색을 어두운 데서 밝은 데로 겹쳐 입체감을 낸다' };
