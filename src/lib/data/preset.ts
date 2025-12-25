export interface Preset {
  stations?: string[];
  stopAtRedLights: boolean;
  redLightStopTime: number;
  topSpeed: number;
  stationStopTime?: number;
}

export const expressSet: Preset = {
  stations: [
    "Humber College",
    "Martin Grove",
    "Mount Olive",
    "Rowntree Mills",
    "Emery",
    "Jane and Finch",
    "Finch West",
  ],
  stopAtRedLights: false,
  redLightStopTime: 0,
  topSpeed: 60,
};

export const ttcSet: Preset = {
  stopAtRedLights: true,
  redLightStopTime: 20,
  topSpeed: 20,
};

export const ttcDecSet: Preset = {
  stopAtRedLights: true,
  redLightStopTime: 20,
  topSpeed: 30,
  stationStopTime: 20,
};
