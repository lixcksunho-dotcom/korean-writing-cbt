export function parseExamStartText(text) {
  const value = (pattern) => {
    const match = pattern.exec(text)
    return match ? Number(match[1]) : null
  }
  return {
    gate: /시작을\s+눌러야/.test(text),
    minutes: value(/시험 시간\s*(\d+)\s*분/),
    objectiveCount: value(/객관식\s*(\d+)\s*문항/),
    essayCount: value(/서술형\s*(\d+)\s*문항/),
    total: value(/\d+\s*\/\s*(\d+)\s*완료/),
  }
}

export async function passExamStartGate(page) {
  await page.waitForFunction(() => {
    const text = document.body.innerText
    return /시작을\s+눌러야/.test(text) || /\d+\s*\/\s*\d+\s*완료/.test(text)
  }, null, { timeout: 20000 })
  const intro = parseExamStartText(await page.locator('body').innerText())
  if (intro.gate) {
    await page.getByRole('link', { name: '시작하기', exact: true })
      .or(page.getByRole('button', { name: '시작하기', exact: true }))
      .click({ timeout: 20000 })
  }
  await page.waitForFunction(() => /\d+\s*\/\s*\d+\s*완료/.test(document.body.innerText), null, { timeout: 20000 })
  return intro
}
