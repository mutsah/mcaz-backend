type ScheduleRow = {
  installmentNo: number;
  dueDate: Date;
  principalDue: number;
  interestDue: number;
  totalDue: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildAmortizationSchedule(
  principal: number,
  annualRate: number,
  termMonths: number,
  disbursedAt: Date,
): ScheduleRow[] {
  const monthlyRate = annualRate / 12;
  const ratePow = Math.pow(1 + monthlyRate, termMonths);
  const monthlyPayment =
    monthlyRate === 0
      ? principal / termMonths
      : (principal * (monthlyRate * ratePow)) / (ratePow - 1);

  let outstanding = principal;
  const rows: ScheduleRow[] = [];

  for (let i = 1; i <= termMonths; i += 1) {
    const interest = round2(outstanding * monthlyRate);
    let principalPart = round2(monthlyPayment - interest);

    if (i === termMonths) {
      principalPart = round2(outstanding);
    }

    const total = round2(principalPart + interest);
    outstanding = round2(outstanding - principalPart);

    const dueDate = new Date(disbursedAt);
    dueDate.setMonth(dueDate.getMonth() + i);

    rows.push({
      installmentNo: i,
      dueDate,
      principalDue: principalPart,
      interestDue: interest,
      totalDue: total,
    });
  }

  return rows;
}
