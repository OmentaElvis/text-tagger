import { INPUT_PATH, OUTPUT_PATH } from '$env/static/private'
import { error, json } from '@sveltejs/kit';
import path from 'path'
import fs from 'fs'

const source = INPUT_PATH || process.cwd()
const output = OUTPUT_PATH || process.cwd()

export async function POST({ request, params }) {
  const tagging = await request.json();
  let fileName = params.id

  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);
  const jsonPath = path.join(output, `${baseName}.json`)

  try {
    fs.writeFileSync(jsonPath, JSON.stringify(tagging));
  } catch (err) {
    throw error(500, { message: err.toString() })
  }

  return json({
    message: "Saved"
  })
}

