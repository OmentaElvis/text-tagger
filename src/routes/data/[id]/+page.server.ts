import { error, type ServerLoad } from "@sveltejs/kit";
import path from 'path'
import fs from 'fs'
import {INPUT_PATH, TAGS_LIST, OUTPUT_PATH} from '$env/static/private'

const filesDir = INPUT_PATH
const outputDir = OUTPUT_PATH
const tagsFile = TAGS_LIST;

export const load: ServerLoad = ({params}) => {
  let fileName = params.id;

  if (!fileName) {
    throw error(500, {message: 'File parameter is required'})
  }
  
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);

  const filePath = path.join(filesDir, fileName);
  const jsonPath = path.join(outputDir,`${baseName}.json`)
  
  if (!fs.existsSync(filePath)) {
    throw error(404, {message: 'File not found'})
  }

  let tags = null;
  if (!fs.existsSync(tagsFile)) {
    throw error(404, {message: 'tags.json file not found.'})
  } else {
    tags = JSON.parse(fs.readFileSync(tagsFile, 'utf8'));
  }

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    let json = null;
    if (fs.existsSync(jsonPath)) {
      json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
    return {
      text: data,
      json,
      tags,
      name: fileName
    }

  } catch(err) {
    throw error(500, {message: err.toString()})
  }
}
