import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'path'
import { homedir } from 'os'

import { load } from 'cheerio'
import { URLRewriter, URLTranslator } from 'cssurl'

import { getPageSlug } from '../page'
import { WebsiteSettings, defaultSettings, defaultSite, Settings, Asset, Page, File, Style, WebsiteData, WEBSITE_CONTEXT_RUNTIME_CLASS_NAME, WEBSITE_CONTEXT_EDITOR_CLASS_NAME } from '../types'

async function mkdirIfExists(path, options = null) {
  try {
    return await mkdir(path, options)
  } catch(err) {
    if(err.code === 'EEXIST') {
      return
    } else {
      throw err
    }
  }
}

// Project paths
const FS_ROOT = process.env.FS_ROOT || join(homedir(), '.silex')
const PROJECT_FILE_NAME = '/.silex.data.json'
export function projectPath(projectId = 'default'): string {
  return join(FS_ROOT, projectId)
}
export async function assetsDir(projectId) {
  const settings = await getSettings(projectId)
  return join(projectPath(projectId), settings.assets.path)
}
export async function assetUrl(projectId, fileName) {
  const settings = await getSettings(projectId)
  return `${settings.prefix}${settings.assets.path}/${fileName}`
}

// Project settings
// Settings come from an optional file at the website root
const SETTINGS_FILE_NAME = '/.silex.json'
export async function getSettings(projectId): Promise<Settings> {
  try {
    const settingsBuffer = await readFile(projectPath(projectId) + SETTINGS_FILE_NAME)
    return {
      ...defaultSettings,
      ...JSON.parse(settingsBuffer.toString()),
    }
  } catch(err) {
    if(err.code === 'ENOENT') {
      return defaultSettings
    } else {
      throw err
    }
  }
}

// Init files for projects and each project
export async function initProjects() {
  await mkdirIfExists(FS_ROOT)
}
export async function initProject(projectId: string) {
  const settings = await getSettings(projectId) as Settings
  const projectFolder = projectPath(projectId)
  const htmlFolder = join(projectFolder, settings.html.path)
  const cssFolder = join(projectFolder, settings.css.path)
  const uploadDir = join(projectFolder, settings.assets.path)

  await mkdirIfExists(htmlFolder, { recursive: true,})
  await mkdirIfExists(cssFolder, { recursive: true,})
  await mkdirIfExists(uploadDir, { recursive: true,})
}

// Read project data
export async function readProjectData(projectId) {
  return readFile(projectPath(projectId) + PROJECT_FILE_NAME)
}
// Write project data
export async function writeProjectData(projectId, data) {
  return writeFile(projectPath(projectId) + PROJECT_FILE_NAME, JSON.stringify(data))
  // Use ziped files?
  // const { data, html }: { data: WebsiteData, html: string} = JSON.parse(req.body)
  // console.log({data, html})
  // const [unpreparedData, dom] = unprepareWebsite(new JSDOM(html), data)
  // const str = dom.serialize()
  // // const fullHtml = DomTools.insertUserHeadTag(str, unpreparedData.site.headUser)
  // dom.window.close()

  // if(path.endsWith('.zip')) {
  //   try {
  //     const zip = new Zip()
  //     zip.addFile('editable.html', Buffer.from(str))
  //     zip.addFile('editable.html.json', Buffer.from(JSON.stringify(unpreparedData)))
  //     await writeFile(path, zip.toBuffer())
  //     res.send('Ok')
  //   } catch (err) {
  //     console.error('Zip file error:', err)
  //     res.status(400).json({ message: 'Zip file error: ' + err.message, code: err.code})
  //   }
  // } else {
  //   try {
  //     await writeFile(path, str)
  //     await writeFile(path + '.json', unpreparedData)
  //     res.send('Ok')
  //   } catch (err) {
  //     console.error('Read file error', err)
  //     res.status(400).json({ message: 'Read file error: ' + err.message, code: err.code})
  //   }
  // }
}
export async function publish(projectId, pages: Page[], siteSettings: WebsiteSettings, files: File[]) {
  const settings = await getSettings(projectId)
  const projectFolder = projectPath(projectId)
  const htmlFolder = join(projectFolder, settings.html.path)
  const cssFolder = join(projectFolder, settings.css.path)
  const uploadDir = join(projectFolder, settings.assets.path)
  pages
  .forEach(async (page, idx) => {
    // page settings override site settings
    function getSetting(name) {
      if(page.settings && page.settings[name]) return page.settings[name]
        return siteSettings[name]
    }
    // update HTML with data from the settings
    const pageName = page.type === 'main' ? 'index' : page.name
    // Process the page HTML to include all settings
    let html
    try {
      const $ = load(files[idx].html)
      $('head').append(`<link rel="stylesheet" href="${settings.prefix}${settings.css.path}/${getPageSlug(pageName)}.css" />`)
      $('head').append(getSetting('head'))
      if(!$('head > title').length) $('head').append('<title/>')
        $('head > title').html(getSetting('title'))
      if(!$('head > link[rel="icon"]').length) $('head').append('<link rel="icon" />')
        $('link[rel="icon"]').attr('href', getSetting('favicon'))
      // all metas
      ;['description', 'og:title', 'og:description', 'og:image'].forEach(prop => {
        const sel = `meta[property="${prop}"]`
        if(!$(sel).length) $('head').append(`<meta property="${prop}" />`)
        $(sel).attr('content', getSetting(prop))
      })
      $('html').attr('lang', getSetting('lang'))
      // render the HTML as string
      html = $.html()
    } catch (err) {
      console.error('Error processing HTML', page, err)
      throw new Error(`Error processing HTML. ${err.message}`)
      return
    }
    // Process the page CSS to have correct relative URLs
    let css = files[idx].css
    try {
      if(cssFolder != projectFolder) {
        const rewriter = new URLRewriter(function(url) {
          const translator = new URLTranslator()
          return translator.translate(url, projectFolder, cssFolder)
        })
        css = rewriter.rewrite(css)
      }
    } catch (err) {
      console.error('Error processing CSS', page, err)
      throw new Error(`Error processing CSS. ${err.message}`)
    }
    try {
      await writeFile(join(htmlFolder, getPageSlug(pageName) + '.html'), html)
      await writeFile(join(cssFolder, getPageSlug(pageName) + '.css'), css)
    } catch (err) {
      throw new Error(`Publication error: could not write files ${pageName}.css and ${pageName}.html. ${err.message}`)
    }
  })
}