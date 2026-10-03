import { assignFingers } from '../model/fingers'
import type { Song } from '../model/song'
import { furElise } from './furElise'
import { greensleeves } from './greensleeves'
import { houseOfTheRisingSun } from './houseOfTheRisingSun'
import { moonlightSonata } from './moonlightSonata'
import { odeToJoy } from './odeToJoy'

export const LIBRARY: Song[] = [odeToJoy, houseOfTheRisingSun, greensleeves, furElise, moonlightSonata].map(
  assignFingers,
)
