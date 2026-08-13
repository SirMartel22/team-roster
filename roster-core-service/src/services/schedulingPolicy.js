const chooseCandidate = ({ duty, members, assignedToday, assignedPreviousDate, history }) => {
  const unusedToday = members.filter((member) => !assignedToday.has(member.id));
  const todayPool = unusedToday.length ? unusedToday : members;
  const rested = todayPool.filter((member) => !assignedPreviousDate.has(member.id));
  const pool = rested.length ? rested : todayPool;

  const ranked = [...pool].sort((a, b) => {
    const aLast = history.get(`${duty.id}:${a.id}`);
    const bLast = history.get(`${duty.id}:${b.id}`);
    if (!aLast && !bLast) return a.id.localeCompare(b.id);
    if (!aLast) return -1;
    if (!bLast) return 1;
    return aLast - bLast || a.id.localeCompare(b.id);
  });

  return {
    member: ranked[0],
    fairnessWarning: rested.length === 0 && todayPool.some((member) => assignedPreviousDate.has(member.id))
      ? "Consecutive-date assignment was unavoidable"
      : null,
  };
};

module.exports = { chooseCandidate };
