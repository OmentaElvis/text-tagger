import { error, json } from "@sveltejs/kit"
import {AUTO_API, INPUT_PATH} from '$env/static/private'
import path from "path";
import fs from "fs"

const source = INPUT_PATH || process.cwd()

export async function GET({params}) {
  let fileName = params.id;
  
  if (!fileName) {
    throw error(500, {message: 'File parameter is required'})
  }

  const filePath = path.join(source, fileName);
  if (!fs.existsSync(filePath)) {
    throw error(404, {message: 'File not found'})
  }

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    
    let req = await fetch(AUTO_API, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text : data
      })
    });

    if (!req.ok) {
      throw `E: ${req.status} Failed to complete auto tag request`
    }

    let body = await req.json();
    return json(body);
    
  } catch (err) {
    throw error(500, {message: err.toString()})
  }
}

