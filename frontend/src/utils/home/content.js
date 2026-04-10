export const buildHomeHeroStages = (t) => [
  t('home.hero.stages.import'),
  t('home.hero.stages.validate'),
  t('home.hero.stages.edit'),
  t('home.hero.stages.analyze'),
  t('home.hero.stages.chart'),
]

export const buildHomeHeroHighlights = (t) => [
  { value: t('home.hero.highlights.oneValue'), label: t('home.hero.highlights.workspace') },
  { value: t('home.hero.highlights.fastValue'), label: t('home.hero.highlights.summary') },
  { value: t('home.hero.highlights.cleanValue'), label: t('home.hero.highlights.tableFirst') },
  { value: t('home.hero.highlights.clearValue'), label: t('home.hero.highlights.chartReady') },
]

export const buildHomeCapabilities = (t) => [
  {
    icon: 'import',
    iconPath: 'M12 3v12M7 10l5 5 5-5M4 19h16',
    title: t('home.capabilities.import.title'),
    text: t('home.capabilities.import.text'),
  },
  {
    icon: 'validate',
    iconPath: 'M20 7L10 17l-6-6M4 4h16',
    title: t('home.capabilities.validate.title'),
    text: t('home.capabilities.validate.text'),
  },
  {
    icon: 'edit',
    iconPath: 'M4 20h5l10-10-5-5L4 15v5zM13 6l5 5',
    title: t('home.capabilities.edit.title'),
    text: t('home.capabilities.edit.text'),
  },
  {
    icon: 'stats',
    iconPath: 'M5 18V9M12 18V5M19 18v-7M3 20h18',
    title: t('home.capabilities.stats.title'),
    text: t('home.capabilities.stats.text'),
  },
  {
    icon: 'chart',
    iconPath: 'M4 18l5-6 4 3 7-8M4 4v14h16',
    title: t('home.capabilities.chart.title'),
    text: t('home.capabilities.chart.text'),
  },
  {
    icon: 'workspace',
    iconPath: 'M4 6h16v12H4zM9 6v12M4 11h16',
    title: t('home.capabilities.workspace.title'),
    text: t('home.capabilities.workspace.text'),
  },
]

export const buildHomeAdvantages = (t) => [
  {
    title: t('home.advantages.workspace.title'),
    text: t('home.advantages.workspace.text'),
  },
  {
    title: t('home.advantages.validation.title'),
    text: t('home.advantages.validation.text'),
  },
  {
    title: t('home.advantages.tableFirst.title'),
    text: t('home.advantages.tableFirst.text'),
  },
  {
    title: t('home.advantages.feedback.title'),
    text: t('home.advantages.feedback.text'),
  },
  {
    title: t('home.advantages.foundation.title'),
    text: t('home.advantages.foundation.text'),
  },
]

export const buildHomeStatsItems = (t) => [
  {
    key: 'steps',
    target: 5,
    suffix: '',
    label: t('home.stats.steps.label'),
    text: t('home.stats.steps.text'),
  },
  {
    key: 'actions',
    target: 6,
    suffix: '',
    label: t('home.stats.actions.label'),
    text: t('home.stats.actions.text'),
  },
  {
    key: 'inputs',
    target: 2,
    suffix: '+',
    label: t('home.stats.inputs.label'),
    text: t('home.stats.inputs.text'),
  },
  {
    key: 'workspace',
    target: 1,
    suffix: '',
    label: t('home.stats.workspace.label'),
    text: t('home.stats.workspace.text'),
  },
]

export const buildHomeWorkflowSteps = (t) => [
  {
    title: t('home.workflow.steps.create.title'),
    text: t('home.workflow.steps.create.text'),
  },
  {
    title: t('home.workflow.steps.import.title'),
    text: t('home.workflow.steps.import.text'),
  },
  {
    title: t('home.workflow.steps.validate.title'),
    text: t('home.workflow.steps.validate.text'),
  },
  {
    title: t('home.workflow.steps.analyze.title'),
    text: t('home.workflow.steps.analyze.text'),
  },
  {
    title: t('home.workflow.steps.visualize.title'),
    text: t('home.workflow.steps.visualize.text'),
  },
]

export const buildHomeDemoScenarios = (t) => [
  {
    key: 'quality',
    label: t('home.demo.scenarios.quality.label'),
    title: t('home.demo.scenarios.quality.title'),
    subtitle: t('home.demo.scenarios.quality.subtitle'),
    labels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    values: [61, 69, 74, 82, 88, 93],
  },
  {
    key: 'distribution',
    label: t('home.demo.scenarios.distribution.label'),
    title: t('home.demo.scenarios.distribution.title'),
    subtitle: t('home.demo.scenarios.distribution.subtitle'),
    labels: ['A', 'B', 'C', 'D', 'E'],
    values: [34, 26, 18, 14, 8],
  },
  {
    key: 'impact',
    label: t('home.demo.scenarios.impact.label'),
    title: t('home.demo.scenarios.impact.title'),
    subtitle: t('home.demo.scenarios.impact.subtitle'),
    labels: [
      t('home.demo.weeks.week1'),
      t('home.demo.weeks.week2'),
      t('home.demo.weeks.week3'),
      t('home.demo.weeks.week4'),
      t('home.demo.weeks.week5'),
    ],
    values: [4, 7, 11, 15, 19],
  },
]

export const buildHomeDemoChartTypes = (t) => [
  { key: 'line', label: t('home.demo.chartTypes.line') },
  { key: 'bar', label: t('home.demo.chartTypes.bar') },
  { key: 'scatter', label: t('home.demo.chartTypes.scatter') },
  { key: 'boxplot', label: t('home.demo.chartTypes.boxplot') },
  { key: 'pie', label: t('home.demo.chartTypes.pie') },
]
