import { error, json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import {INPUT_PATH, OUTPUT_PATH} from '$env/static/private'

const source = INPUT_PATH || process.cwd()
const output = OUTPUT_PATH || process.cwd()

export async function GET() {
  const directoryPath = source

  try {
    let files = fs.readdirSync(directoryPath);
    let filesMapped = files.map((fileName) => {
      const ext = path.extname(fileName);
      const baseName = path.basename(fileName, ext);
      const jsonPath = path.join(output,`${baseName}.json`)
      
      return {
        name: fileName,
        tagged: fs.existsSync(jsonPath)
      }
    })
    return json({
      files: filesMapped
    })
  } catch (err) {
    throw error(500, {message: err.toString()})
  }
}
