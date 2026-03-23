export const HOME_HERO_STAGES = ['Import', 'Validate', 'Edit', 'Analyze', 'Chart']

export const HOME_HERO_HIGHLIGHTS = [
  { value: 'One', label: 'Integrated workspace' },
  { value: 'Fast', label: 'Summary generation' },
  { value: 'Clean', label: 'Table-first editing' },
  { value: 'Clear', label: 'Chart-ready outputs' },
]

export const HOME_CAPABILITIES = [
  {
    icon: 'import',
    iconPath: 'M12 3v12M7 10l5 5 5-5M4 19h16',
    title: 'Import CSV or TXT datasets',
    text: 'Start quickly with tabular files and bring raw data into a dedicated project workspace.',
  },
  {
    icon: 'validate',
    iconPath: 'M20 7L10 17l-6-6M4 4h16',
    title: 'Validate structure and values',
    text: 'Check inferred columns and detect issues before spending time on charts and interpretation.',
  },
  {
    icon: 'edit',
    iconPath: 'M4 20h5l10-10-5-5L4 15v5zM13 6l5 5',
    title: 'Inspect and edit rows directly',
    text: 'Correct entries in a table-first interface so data cleaning stays close to the source values.',
  },
  {
    icon: 'stats',
    iconPath: 'M5 18V9M12 18V5M19 18v-7M3 20h18',
    title: 'Generate summary statistics',
    text: 'Get fast descriptive metrics to understand distributions and guide the next analysis step.',
  },
  {
    icon: 'chart',
    iconPath: 'M4 18l5-6 4 3 7-8M4 4v14h16',
    title: 'Build useful visualizations',
    text: 'Create chart views from cleaned data and move from values to interpretable visual stories.',
  },
  {
    icon: 'workspace',
    iconPath: 'M4 6h16v12H4zM9 6v12M4 11h16',
    title: 'Work in one connected flow',
    text: 'Avoid fragmented tool chains and keep import, cleaning, analytics, and charts aligned.',
  },
]

export const HOME_ADVANTAGES = [
  {
    title: 'One workspace instead of scattered tools',
    text: 'Reduce context switching between spreadsheet edits, scripts, and chart builders.',
  },
  {
    title: 'Validation before visualization',
    text: 'Catch schema and value issues early to protect chart quality and interpretation accuracy.',
  },
  {
    title: 'Table-first editing',
    text: 'Perform quick data corrections where rows are visible, without leaving the analysis context.',
  },
  {
    title: 'Fast analytical feedback',
    text: 'Summary statistics provide immediate checkpoints while refining datasets.',
  },
  {
    title: 'Stable foundation for academic extension',
    text: 'The architecture is structured for thesis demonstrations and iterative feature growth.',
  },
]

export const HOME_STATS_ITEMS = [
  {
    key: 'steps',
    target: 5,
    suffix: '',
    label: 'Workflow stages',
    text: 'From first import to chart-driven conclusions.',
  },
  {
    key: 'actions',
    target: 6,
    suffix: '',
    label: 'Core platform actions',
    text: 'Import, validate, inspect, edit, analyze, visualize.',
  },
  {
    key: 'inputs',
    target: 2,
    suffix: '+',
    label: 'Tabular input formats',
    text: 'Ready for CSV and TXT datasets.',
  },
  {
    key: 'workspace',
    target: 1,
    suffix: '',
    label: 'Integrated environment',
    text: 'A single place for the full data preparation cycle.',
  },
]

export const HOME_WORKFLOW_STEPS = [
  {
    title: 'Create a project',
    text: 'Open a clean workspace for one dataset or research question.',
  },
  {
    title: 'Import your dataset',
    text: 'Load CSV or TXT files and start with visible table structure.',
  },
  {
    title: 'Validate and inspect',
    text: 'Review columns, value quality, and early consistency checks.',
  },
  {
    title: 'Edit and analyze',
    text: 'Clean rows directly and review summary statistics for direction.',
  },
  {
    title: 'Visualize and present',
    text: 'Build clear charts and translate findings into useful conclusions.',
  },
]

export const HOME_DEMO_SCENARIOS = [
  {
    key: 'quality',
    label: 'Quality trend',
    title: 'Validation quality improves after each iteration',
    subtitle: 'Dataset consistency score by sprint',
    labels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    values: [61, 69, 74, 82, 88, 93],
  },
  {
    key: 'distribution',
    label: 'Category mix',
    title: 'Cleaned data distribution by segment',
    subtitle: 'Rows kept after validation and editing',
    labels: ['A', 'B', 'C', 'D', 'E'],
    values: [34, 26, 18, 14, 8],
  },
  {
    key: 'impact',
    label: 'Insight growth',
    title: 'Actionable findings per analysis cycle',
    subtitle: 'How quickly insights scale in one workspace',
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
    values: [4, 7, 11, 15, 19],
  },
]

export const HOME_DEMO_CHART_TYPES = [
  { key: 'line', label: 'Line' },
  { key: 'bar', label: 'Bar' },
  { key: 'scatter', label: 'Scatter' },
  { key: 'boxplot', label: 'Boxplot' },
  { key: 'pie', label: 'Pie' },
]
