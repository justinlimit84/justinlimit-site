import { whenNear } from './main'
import { startEnergyLab } from './lab-energy'
import { startMachinesLab } from './lab-machines'
import { startPowerLab } from './lab-power'
import { startWorkLab } from './lab-work'

const labs: Record<string, (el: HTMLElement) => void> = {
  work: startWorkLab,
  energy: startEnergyLab,
  power: startPowerLab,
  machines: startMachinesLab,
}

document.querySelectorAll<HTMLElement>('[data-lab]').forEach((el) => {
  const start = labs[el.dataset.lab!]
  if (start) whenNear(el, () => start(el))
})
