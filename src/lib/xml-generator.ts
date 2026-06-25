import type { MigrationObject, MigrationObjectField } from './migration-objects'

// Generates MS Excel XML Spreadsheet 2003 format — the only format
// accepted by the SAP S/4HANA Migration Cockpit staging table approach.
export function generateXmlTemplate(object: MigrationObject, sampleRows = 3): string {
  const fields = object.fields

  const headerRow = fields
    .map((f) => xmlCell(f.label + (f.required ? ' *' : ''), 'String'))
    .join('\n        ')

  const technicalRow = fields
    .map((f) => xmlCell(f.name, 'String'))
    .join('\n        ')

  const sampleDataRows = Array.from({ length: sampleRows }, () =>
    fields
      .map((f) => xmlCell(f.example ?? '', typeToSs(f.type)))
      .join('\n        ')
  )
    .map(
      (cells) => `      <Row>\n        ${cells}\n      </Row>`
    )
    .join('\n')

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Title>${escapeXml(object.name)} Migration Template</Title>
    <Author>SAP Migrator SaaS</Author>
    <Description>${escapeXml(object.description)}</Description>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1e3a5f" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="technical">
      <Font ss:Italic="1" ss:Color="#666666" ss:Size="9"/>
      <Interior ss:Color="#f0f4f8" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="required">
      <Interior ss:Color="#fff3cd" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escapeXml(object.name).substring(0, 31)}">
    <Table ss:DefaultColumnWidth="120">
      <Row>
        ${headerRow}
      </Row>
      <Row>
        ${technicalRow}
      </Row>
${sampleDataRows}
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <FreezePanes/>
      <FrozenNoSplit/>
      <SplitHorizontal>2</SplitHorizontal>
      <TopRowBottomPane>2</TopRowBottomPane>
    </WorksheetOptions>
  </Worksheet>
  <Worksheet ss:Name="Field Guide">
    <Table ss:DefaultColumnWidth="150">
      <Row>
        ${xmlCell('Field Name', 'String')}
        ${xmlCell('Technical Name', 'String')}
        ${xmlCell('Required', 'String')}
        ${xmlCell('Type', 'String')}
        ${xmlCell('Max Length', 'String')}
        ${xmlCell('Example', 'String')}
      </Row>
      ${fields
        .map(
          (f) => `      <Row>
        ${xmlCell(f.label, 'String')}
        ${xmlCell(f.name, 'String')}
        ${xmlCell(f.required ? 'Yes' : 'No', 'String')}
        ${xmlCell(f.type, 'String')}
        ${xmlCell(f.maxLength?.toString() ?? '', 'String')}
        ${xmlCell(f.example ?? '', 'String')}
      </Row>`
        )
        .join('\n')}
    </Table>
  </Worksheet>
</Workbook>`
}

function xmlCell(value: string, ssType: string): string {
  return `<Cell><Data ss:Type="${ssType}">${escapeXml(value)}</Data></Cell>`
}

function typeToSs(type: MigrationObjectField['type']): string {
  if (type === 'number') return 'Number'
  return 'String'
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function xmlTemplateFilename(objectKey: string): string {
  return `Source_data_for_${objectKey}.xml`
}
