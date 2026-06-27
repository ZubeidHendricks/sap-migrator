import { describe, it, expect } from 'vitest'
import { generateXmlTemplate, xmlTemplateFilename } from '@/lib/xml-generator'
import { getObjectByKey, type MigrationObject } from '@/lib/migration-objects'

const glAccount = getObjectByKey('GL_ACCOUNT') as MigrationObject

describe('xmlTemplateFilename', () => {
  it('matches the SAP Migration Cockpit naming convention', () => {
    expect(xmlTemplateFilename('GL_ACCOUNT')).toBe('Source_data_for_GL_ACCOUNT.xml')
  })
})

describe('generateXmlTemplate', () => {
  const xml = generateXmlTemplate(glAccount)

  it('produces an Excel 2003 XML Spreadsheet', () => {
    expect(xml).toContain('<?xml version="1.0"?>')
    expect(xml).toContain('<?mso-application progid="Excel.Sheet"?>')
    expect(xml).toContain('urn:schemas-microsoft-com:office:spreadsheet')
  })

  it('includes both the field-label row and the technical-name row', () => {
    // technical name for GL account number
    expect(xml).toContain('>SAKNR<')
    // label with a required marker
    expect(xml).toContain('GL Account Number *')
  })

  it('marks required fields with an asterisk', () => {
    const requiredCount = glAccount.fields.filter((f) => f.required).length
    const asterisks = (xml.match(/ \*</g) || []).length
    expect(asterisks).toBe(requiredCount)
  })

  it('generates the requested number of sample data rows', () => {
    const withRows = generateXmlTemplate(glAccount, 5)
    // header row + technical row + 5 sample rows + field guide rows
    const sampleRows = generateXmlTemplate(glAccount, 5).split('<Row>').length
    expect(withRows).toContain('<Row>')
    expect(sampleRows).toBeGreaterThan(5)
  })

  it('escapes XML-sensitive characters in object metadata', () => {
    const evilObject: MigrationObject = {
      ...glAccount,
      name: 'Tom & Jerry <Co>',
      description: 'Uses "quotes" & <tags>',
    }
    const out = generateXmlTemplate(evilObject)
    expect(out).toContain('Tom &amp; Jerry &lt;Co&gt;')
    expect(out).not.toContain('Tom & Jerry <Co>')
  })

  it('includes a Field Guide worksheet', () => {
    expect(xml).toContain('ss:Name="Field Guide"')
    expect(xml).toContain('Technical Name')
  })
})
