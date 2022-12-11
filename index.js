import Zip from 'adm-zip';

// BK2 format documentation: https://tasvideos.org/Bizhawk/BK2Format

const filename = process.argv[2];
const bk2 =  new Zip(filename);

/**
 * @return string[] | undefined
 * parse given bk2 into an array of strings by line
*/
const parseInput = () => {
  const inputLog = bk2.getEntries().find(entry => entry.entryName === 'Input\ Log.txt');
  if (!inputLog) {
    return undefined;
  }
  return inputLog.getData().toString('utf8').split('\n');
};

/**
 * @param logKey: string[]
 * @return Map<string, number>
*/
const initInputMap = (logKey) => {
  const inputMap = new Map();
  logKey.forEach(entry => inputMap.set(entry, 0));
  return inputMap;
};

/**
 * @param inputLines: string[]
 * @return Map<string, number>
 * get map of buttons and how many times they are pressed
*/
const getInputMap = (inputLines) => {
  const logKey = getLogKey(inputLines);
  const inputMap = initInputMap(logKey);
  let lastFrame;
  inputLines.forEach(line => {
    if (!line.startsWith('|')) {
      return;
    }
    // now processing an input frame
    const frame = readInputFrame(line, logKey);
    frame.forEach((buttonInfo, buttonName) => {
      const isDigital = buttonInfo.type === 'digital';
      const wasInactive = !lastFrame || !lastFrame.get(buttonName).value;
      const isActive = buttonInfo.value;
      if (isDigital && wasInactive && isActive) {
        inputMap.set(
          buttonName,
          inputMap.get(buttonName) + 1
        );
      }
    });
    lastFrame = frame;
  });
  return inputMap;
};

/**
 * @param inputLines: string[]
 * @return string[]
 * get ordered list of button names
*/
const getLogKey = (inputLines) => {
  const keyStr = inputLines.find(line => line.startsWith('LogKey'));
  if (!keyStr) {
    throw new Error('LogKey missing from InputLog');
  }
  return keyStr
    // remove "LogKey:" from start of string
    .slice(7)
    // divide into array with "|" or "#" as separators
    .split(/\||#/)
    // remove non-word entries
    .filter(entry =>  /\w/.test(entry));
};

/**
 * @param frame: string
 * @param logKey: string[]
 * @return Map<
  * string,
  * {
    * value: number | boolean;
    * type: 'analog' | 'digital';
  * }
 * >
*/
const readInputFrame = (frame, logKey) => {
  const buttonPattern = / *(?<analog>-?\d+),|(?<digitalFalse>\.)|(?<digitalTrue>[^|\r\n])/g;
  const matches = [...frame.matchAll(buttonPattern)];
  if (!logKey.length || logKey.length !== matches.length) {
    throw new Error('unable to parse input');
  }
  const inputFrame = new Map();
  matches.forEach((button, index) => {
    const { analog, digitalFalse, digitalTrue } = button.groups;
    const name = logKey[index];
    let type;
    let value;
    switch (true) {
      case analog !== undefined:
        value = Number.parseInt(analog);
        type = 'analog';
        break;
      case digitalFalse !== undefined:
        value = false;
        type = 'digital';
        break;
      case digitalTrue !== undefined:
      default:
        value = true;
        type = 'digital';
        break;
    }
    inputFrame.set(
      name,
      {
        value,
        type
      }
    );
  });
  return inputFrame;
};

(() => {
  const input = parseInput();
  if (!input) {
    console.log('no input found--is the filename correct?');
    return;
  }
  const map = getInputMap(input);
  console.log(map);
})();
