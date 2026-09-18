-- 관리자 평가 기능 제거 (2026-09-18 사용자 결정).
-- 직무능력 분석은 직원 설문 값만 쓴다. ManagerRating 표와 그 관계를 없앤다.
-- AbilityAxis enum 은 문항이 쓰므로 그대로 둔다.
DROP TABLE IF EXISTS "ManagerRating";
