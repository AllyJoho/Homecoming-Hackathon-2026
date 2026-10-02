import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// The two original quiz banks are hand-authored. This file supplies the
// remaining canonical skills with a small, reviewable starter bank. Keeping
// the concepts here makes the content easy to audit without hiding quiz
// generation inside the seed script.
const banks = {
  'html-css-fundamentals': [
    ['Semantic HTML', 'uses elements that describe the meaning and structure of content', ['only class names to style every element', 'JavaScript to draw all page content', 'tables for page layout']],
    ['Flexbox', 'lays out items along one main axis and distributes available space', ['stores data in browser storage', 'creates database relationships', 'compresses image files']],
    ['CSS Grid', 'lays out content across rows and columns', ['validates a form on the server', 'changes an HTTP status code', 'loads a web font']],
  ],
  'frontend-frameworks': [
    ['Component', 'is a reusable unit of UI markup and behavior', ['a database table', 'a DNS record', 'a build artifact only']],
    ['Props', 'are inputs passed from a parent component to a child', ['private database credentials', 'CSS files fetched from a CDN', 'browser history entries']],
    ['State', 'is data owned by a component that can change and trigger a re-render', ['a server IP address', 'a Git tag', 'an image compression format']],
  ],
  'backend-apis': [
    ['REST resource', 'is a business entity addressed by a URL and manipulated with HTTP methods', ['a CSS selector', 'a local browser cookie only', 'a compiled binary']],
    ['HTTP 401', 'indicates that authentication is required or has failed', ['indicates a successful response', 'means the server crashed', 'means the requested resource was permanently moved']],
    ['Idempotent request', 'can be repeated without changing the result after the first successful application', ['must always create a new record', 'can only be sent over UDP', 'cannot include a response body']],
  ],
  'git-version-control': [
    ['Commit', 'is a recorded snapshot of changes in a repository', ['a temporary editor tab', 'a deployed server', 'a database index']],
    ['Branch', 'is an independent line of development pointing to a series of commits', ['a type of merge conflict', 'a package registry', 'a code formatter']],
    ['Merge conflict', 'happens when Git cannot automatically reconcile competing changes', ['a failed DNS lookup', 'an expired access token', 'a missing CSS reset']],
  ],
  'web-accessibility': [
    ['Semantic element', 'communicates structure and purpose to browsers and assistive technology', ['is always visually hidden', 'must be styled with animation', 'can only contain images']],
    ['Keyboard focus', 'indicates which interactive control will receive keyboard input', ['is a database lock', 'is the browser download cache', 'is a color palette']],
    ['Alternative text', 'describes the purpose or meaning of a meaningful image', ['replaces every visible heading', 'encrypts an image URL', 'makes decorative images interactive']],
  ],
  'testing-and-debugging': [
    ['Unit test', 'checks a small piece of code in isolation', ['deploys production servers', 'replaces source control', 'measures internet bandwidth']],
    ['Stack trace', 'shows the call path that led to an error', ['is a database schema', 'is a UI color token', 'is a release checklist']],
    ['Regression test', 'checks that a previously working behavior still works after a change', ['tests only brand-new features', 'deletes old test data', 'measures CPU temperature']],
  ],
  'cloud-deployment-cicd': [
    ['Continuous integration', 'automatically builds and tests changes as they are integrated', ['manually copies files to every laptop', 'stores only production passwords', 'replaces source control']],
    ['Blue-green deployment', 'keeps two production environments so traffic can switch between versions', ['runs two databases with no backups', 'changes CSS from blue to green', 'requires every user to reinstall an app']],
    ['Environment variable', 'provides configuration to an application without hard-coding it in source', ['is a unit test assertion', 'is a Git merge strategy', 'is a database primary key']],
  ],
  'data-cleaning': [
    ['Missing-value analysis', 'determines why values are absent and how that should be handled', ['always replaces blanks with zero', 'deletes every incomplete row', 'sorts data alphabetically']],
    ['Duplicate record', 'is a repeated representation of the same real-world entity or event', ['a valid foreign key', 'a chart axis label', 'a model hyperparameter']],
    ['Normalization', 'standardizes values into a consistent representation for analysis', ['encrypts a database', 'increases screen brightness', 'trains a neural network']],
  ],
  'spreadsheet-analysis': [
    ['Pivot table', 'summarizes and groups rows by fields without changing the source data', ['encrypts a workbook', 'is a single-cell comment', 'is a database server']],
    ['Absolute reference', 'keeps a cell reference fixed when a formula is copied', ['always points to the last row', 'only works in charts', 'deletes formulas when copied']],
    ['Lookup', 'finds a matching key and returns a related value', ['formats every cell as currency', 'creates a presentation slide', 'removes all blank rows']],
  ],
  'data-visualization': [
    ['Bar chart', 'compares values across discrete categories', ['shows only network topology', 'is best for encrypting data', 'always proves causation']],
    ['Line chart', 'shows how a measure changes across an ordered sequence such as time', ['is only for text labels', 'cannot show trends', 'replaces statistical tests']],
    ['Dashboard', 'combines coordinated visual summaries to support monitoring or decisions', ['is a raw database dump', 'must contain every available metric', 'is a password manager']],
  ],
  'statistics-fundamentals': [
    ['Median', 'is the middle value after observations are ordered', ['is always the largest value', 'is the number of observations squared', 'is a probability of zero']],
    ['P-value', 'measures how surprising the observed result would be if the null hypothesis were true', ['is the probability the null is true', 'is the sample mean', 'is a confidence interval width']],
    ['Confidence interval', 'gives a range produced by a method intended to capture a population parameter at a chosen confidence level', ['guarantees every future value is inside', 'contains only the sample minimum', 'is the same as a prediction label']],
  ],
  'python-for-data': [
    ['DataFrame', 'is a labeled two-dimensional table commonly used in pandas', ['is a Python package installer', 'is a neural-network layer only', 'is a browser DOM node']],
    ['Vectorization', 'applies an operation to an array or column without an explicit Python loop over each item', ['turns code into HTML', 'encrypts a CSV file', 'creates a Git branch']],
    ['NumPy array', 'is a homogeneous, multidimensional structure designed for numerical operations', ['is a relational database', 'is a Markdown document', 'is a web server route']],
  ],
  'machine-learning-basics': [
    ['Supervised learning', 'learns a mapping from examples that include target labels', ['learns only from unlabeled data', 'never evaluates predictions', 'is the same as data backup']],
    ['Overfitting', 'occurs when a model memorizes training patterns and generalizes poorly', ['means the model has no parameters', 'is always caused by missing labels', 'means test accuracy must be perfect']],
    ['Train-test split', 'keeps evaluation examples separate from the data used to fit a model', ['duplicates every training row', 'removes the target column from all data', 'guarantees a causal result']],
  ],
  'etl-data-warehousing': [
    ['ETL', 'extracts data, transforms it, and loads it into a target system', ['encrypts, tags, and logs a password', 'tests, deploys, and links a UI', 'trains, tunes, and labels a model']],
    ['Star schema', 'uses a central fact table connected to descriptive dimension tables', ['stores every value in one wide text field', 'is a network firewall design', 'is a UI component hierarchy']],
    ['Idempotent pipeline', 'produces the same target state when the same input is processed repeatedly', ['must append duplicates on every run', 'can only run once', 'cannot include validation']],
  ],
  'database-design': [
    ['Normalization', 'reduces redundancy by organizing data into related tables with clear dependencies', ['stores every field in one JSON string', 'removes all relationships', 'is the same as a backup']],
    ['Primary key', 'uniquely identifies each row and cannot be NULL', ['must contain a person name', 'is always a foreign key', 'stores only encrypted values']],
    ['Foreign key', 'references a key in another table to represent a relationship', ['must be globally unique across all tables', 'is a chart filter', 'is a password hash algorithm']],
  ],
  'systems-analysis': [
    ['As-is process', 'describes how work is performed in the current state', ['is the final deployed design', 'is a database backup', 'is an employee evaluation']],
    ['Gap analysis', 'compares the current state with a desired future state to identify differences', ['removes all project risks', 'writes code without requirements', 'measures only page load time']],
    ['Feasibility study', 'evaluates whether a proposed solution is practical within constraints', ['guarantees stakeholder agreement', 'replaces user testing', 'is a source-control operation']],
  ],
  'requirements-gathering': [
    ['Acceptance criterion', 'states an observable condition that must be met for a requirement to be accepted', ['is a vague project aspiration', 'is a database password', 'is a visual design token']],
    ['Stakeholder interview', 'elicits needs, constraints, and context directly from an affected person or group', ['is a deployment rollback', 'is an automated unit test', 'is a network scan']],
    ['Nonfunctional requirement', 'specifies a quality or constraint such as performance, security, or availability', ['describes only a button label', 'is always optional', 'is a row in a fact table']],
  ],
  'business-process-modeling': [
    ['Swimlane', 'groups process steps by the role, team, or system responsible for them', ['is a database partition key', 'is an encryption mode', 'is a chart color']],
    ['BPMN gateway', 'represents a decision or branching point in a business process', ['stores customer passwords', 'renders CSS grid columns', 'identifies a Git commit']],
    ['Bottleneck', 'is a step that limits the throughput of the overall process', ['is always the first step', 'is a type of stakeholder', 'is a completed audit']],
  ],
  'it-infrastructure-basics': [
    ['DNS', 'maps human-readable domain names to network addresses', ['encrypts hard drives', 'assigns project budgets', 'renders HTML']],
    ['Virtual machine', 'emulates a computer system using software on a physical host', ['is a physical cable', 'is a spreadsheet formula', 'is a user requirement']],
    ['RAID', 'combines disks to improve redundancy, performance, or both', ['is an API authentication token', 'is a web accessibility standard', 'is a code review']],
  ],
  'enterprise-systems': [
    ['ERP', 'integrates business functions such as finance, supply chain, and operations', ['is a browser rendering engine', 'is a network packet format', 'is a single social-media post']],
    ['CRM pipeline', 'tracks prospects and customer interactions through stages of a sales process', ['is a server boot sequence', 'is a data encryption key', 'is a CSS layout model']],
    ['Master data', 'is shared, relatively stable business information used consistently across systems', ['is temporary log output', 'is a random test fixture', 'is a user-interface animation']],
  ],
  'cloud-computing-fundamentals': [
    ['IaaS', 'provides virtualized compute, storage, and networking that the customer manages', ['provides only a finished business application', 'is a spreadsheet macro', 'is a physical office lease']],
    ['PaaS', 'provides a managed application platform so teams focus more on code than infrastructure', ['requires managing every disk manually', 'is a cryptographic hash', 'is a project charter']],
    ['Elasticity', 'allows capacity to expand or contract with workload demand', ['means data is never backed up', 'means every service is free', 'means a server has no operating system']],
  ],
  'it-service-management': [
    ['Incident', 'is an unplanned interruption or reduction in the quality of an IT service', ['is a planned feature request', 'is a database schema', 'is a completed training course']],
    ['Service request', 'is a user request for a standard, pre-defined service or access item', ['is always a security breach', 'is a code merge', 'is a network cable']],
    ['Change management', 'controls planned modifications to services while assessing risk and impact', ['blocks every change forever', 'only handles employee hiring', 'replaces incident diagnosis']],
  ],
  'technical-support-troubleshooting': [
    ['Reproduction step', 'recreates a problem under known conditions so its cause can be isolated', ['is a final billing receipt', 'is an encryption key', 'is a design color']],
    ['Least-invasive fix', 'starts with a low-risk change before attempting disruptive remediation', ['always replaces all hardware', 'deletes logs first', 'skips confirmation with the user']],
    ['Root cause', 'is the underlying condition that allows a problem to occur', ['is only the visible symptom', 'is a user password', 'is a support ticket number']],
  ],
  'network-security-basics': [
    ['Firewall', 'filters network traffic according to defined rules', ['compresses backups', 'creates user stories', 'renders a web page']],
    ['VPN', 'creates an authenticated, encrypted tunnel across an untrusted network', ['is a public DNS record', 'is a database index', 'is a chart type']],
    ['Network segmentation', 'separates networks or hosts to limit reach and contain incidents', ['puts every device on one flat network', 'removes the need for authentication', 'only changes screen layout']],
  ],
  'secure-coding-practices': [
    ['Parameterized query', 'keeps SQL code separate from user-provided values to prevent injection', ['concatenates raw input into SQL', 'stores passwords in plain text', 'disables all database constraints']],
    ['Output encoding', 'escapes data for its target context before rendering it to reduce XSS risk', ['executes user input as HTML', 'removes authentication', 'turns off browser updates']],
    ['CSRF protection', 'helps ensure a state-changing request came from the intended application context', ['makes passwords reversible', 'replaces TLS everywhere', 'prevents every possible network scan']],
  ],
  'risk-assessment': [
    ['Vulnerability', 'is a weakness that could be exploited or cause harm', ['is the value of an asset', 'is a completed control', 'is always an active attack']],
    ['Risk rating', 'combines factors such as likelihood and impact to prioritize treatment', ['is based only on asset color', 'guarantees an incident will happen', 'is the same as a password']],
    ['Risk treatment', 'chooses how to modify, accept, transfer, or avoid a risk', ['ignores identified weaknesses', 'only lists employees', 'is a type of firewall packet']],
  ],
  'incident-response': [
    ['Containment', 'limits an incident so the threat or damage cannot spread further', ['deletes all evidence immediately', 'writes a marketing plan', 'restores every system before investigation']],
    ['Evidence preservation', 'protects relevant artifacts so they can be analyzed and trusted later', ['changes timestamps intentionally', 'reboots every system without notes', 'publishes logs publicly']],
    ['Eradication', 'removes the threat and its persistence from affected systems', ['is the same as detection', 'only informs customers', 'means ignoring the root cause']],
  ],
  'identity-access-management': [
    ['Least privilege', 'gives a principal only the access needed for its task', ['gives every user administrator rights', 'removes all auditing', 'shares one account with everyone']],
    ['Multi-factor authentication', 'requires two or more independent types of evidence to verify identity', ['uses two passwords of the same type', 'is only a firewall rule', 'removes the need for usernames']],
    ['Role-based access control', 'assigns permissions through job or system roles', ['grants permissions only by IP address', 'stores data in a spreadsheet', 'encrypts network traffic']],
  ],
  'cryptography-basics': [
    ['Hash', 'is a one-way digest commonly used to detect changes or store password verifiers', ['is reversible encryption with a public key', 'is a network cable', 'is a user role']],
    ['Symmetric encryption', 'uses a shared secret key to encrypt and decrypt data', ['uses no key', 'always uses two unrelated keys', 'only signs documents']],
    ['Digital signature', 'provides evidence of integrity and the signer through asymmetric cryptography', ['hides data from every reader', 'is a database index', 'is the same as compression']],
  ],
  'security-monitoring-log-analysis': [
    ['SIEM', 'collects and correlates security events to support monitoring and investigation', ['is a source-control branch', 'is a disk redundancy array', 'is a UI wireframe']],
    ['Indicator of compromise', 'is an observable artifact that may signal malicious activity', ['is a guaranteed benign event', 'is a project milestone', 'is an encryption algorithm']],
    ['Baseline', 'describes expected behavior so meaningful deviations can be investigated', ['is a list of known passwords', 'is always a firewall block', 'is a completed incident report']],
  ],
  'vulnerability-assessment': [
    ['CVE', 'is a standardized identifier for a publicly disclosed vulnerability', ['is a cloud pricing tier', 'is a user-interface test', 'is a database backup']],
    ['CVSS', 'provides a standardized way to score the severity of a vulnerability', ['is a code formatter', 'is a password manager', 'is a network protocol']],
    ['Remediation priority', 'considers severity, exploitability, exposure, and business impact when ordering fixes', ['fixes only the oldest finding', 'ignores asset importance', 'is based solely on alphabetical order']],
  ],
  'project-planning-scheduling': [
    ['Work breakdown structure', 'decomposes project scope into smaller deliverables and work packages', ['is a contact list', 'is a database backup', 'is a test assertion']],
    ['Critical path', 'is the sequence of dependent tasks that determines the shortest project duration', ['is always the cheapest sequence', 'contains no dependencies', 'is a stakeholder map']],
    ['Scope baseline', 'is the approved reference for what the project will deliver', ['changes after every casual suggestion', 'is only a team calendar', 'is a server configuration']],
  ],
  'agile-scrum': [
    ['Sprint', 'is a fixed timebox in which a team creates a usable increment', ['is an annual budget review', 'is an incident ticket', 'is a database migration only']],
    ['Product backlog', 'is an ordered list of product work and opportunities', ['is a fixed legal contract', 'is a server log', 'is a presentation deck']],
    ['Retrospective', 'is a regular meeting where a team inspects its process and chooses improvements', ['ranks customers by revenue', 'approves every budget change', 'replaces product discovery']],
  ],
  'budgeting-resource-management': [
    ['Cost baseline', 'is the approved time-phased budget used to compare actual performance', ['is an unapproved wish list', 'is a password policy', 'is a UI prototype']],
    ['Resource leveling', 'adjusts work timing to resolve over-allocation of people or equipment', ['adds unlimited staff for free', 'deletes project scope automatically', 'is a database normalization rule']],
    ['Cost variance', 'compares planned or earned cost with actual cost to show a difference', ['is always zero at project start', 'measures only quality defects', 'is a stakeholder persona']],
  ],
  'stakeholder-management': [
    ['Power-interest grid', 'groups stakeholders by influence and interest to guide engagement', ['is a sprint burndown', 'is a database schema', 'is a color contrast test']],
    ['RACI', 'clarifies who is responsible, accountable, consulted, and informed for work', ['is a risk scoring formula', 'is a cloud storage tier', 'is a usability heuristic']],
    ['Expectation management', 'sets a shared understanding of outcomes, constraints, timing, and tradeoffs', ['promises every request immediately', 'avoids communicating bad news', 'only reports final results']],
  ],
  'change-management': [
    ['Change impact assessment', 'identifies who and what will be affected by a proposed change', ['is a code compilation step', 'is a database index', 'is a chart legend']],
    ['Adoption metric', 'measures whether people are using and benefiting from a new process or system', ['is only the project start date', 'is a firewall rule', 'is a file extension']],
    ['Change champion', 'helps peers understand, practice, and adopt a change', ['blocks all feedback', 'owns every technical decision', 'is a replacement for training materials']],
  ],
  'product-management-basics': [
    ['User story', 'describes a desired capability from a user perspective and its value', ['is a production server log', 'is a legal invoice only', 'is a database backup']],
    ['MVP', 'is the smallest useful product version that can test important assumptions', ['contains every planned feature', 'is always a throwaway prototype', 'must be released without feedback']],
    ['Prioritization', 'orders opportunities by factors such as user value, impact, effort, and risk', ['selects only the newest idea', 'ignores constraints', 'means every item is urgent']],
  ],
  'technical-writing': [
    ['Task procedure', 'gives ordered steps that help a reader complete a goal', ['is a list of unrelated slogans', 'is a database query plan', 'is a color palette']],
    ['Audience analysis', 'adapts terminology, context, and detail to the reader', ['uses the same jargon for everyone', 'removes all examples', 'only checks spelling']],
    ['Information architecture', 'organizes content so readers can find and understand it', ['is a server deployment method', 'is an encryption key', 'is a spreadsheet formula']],
  ],
  'presentation-skills': [
    ['Audience adaptation', 'selects content and delivery based on what listeners need to decide or do', ['uses identical detail for every audience', 'removes the main point', 'avoids examples entirely']],
    ['Signposting', 'uses verbal or visual cues to show where a presentation is going', ['hides the structure from listeners', 'is a database operation', 'is a form validation rule']],
    ['Slide hierarchy', 'makes the main message and supporting points visually distinguishable', ['gives every word equal emphasis', 'uses as many colors as possible', 'replaces rehearsal']],
  ],
  'business-writing': [
    ['BLUF', 'puts the bottom line or main conclusion first', ['buries the request at the end', 'means every sentence is a heading', 'is a spreadsheet function']],
    ['Action item', 'states what must be done, by whom, and usually by when', ['is an unowned idea', 'is a decorative sentence', 'is a database constraint']],
    ['Plain language', 'communicates clearly with familiar words and direct sentence structure', ['maximizes jargon', 'removes all necessary detail', 'uses passive voice everywhere']],
  ],
  'ux-design-fundamentals': [
    ['Usability heuristic', 'is a general principle used to evaluate how well an interface supports users', ['is a database index', 'is a deployment target', 'is a network packet']],
    ['User flow', 'maps the steps and decisions a user takes to complete a goal', ['is a source-control history', 'is a chart of server costs', 'is a password policy']],
    ['Information architecture', 'organizes content, navigation, and labels so users can find what they need', ['is only a visual color choice', 'is a cloud pricing model', 'is a unit test']],
  ],
  'ui-visual-design': [
    ['Contrast', 'creates enough visual difference between elements to support hierarchy and readability', ['makes every element identical', 'is only a server setting', 'removes text labels']],
    ['Typography hierarchy', 'uses size, weight, and spacing to show relationships between text levels', ['uses one size for everything', 'is a database relationship', 'is a deployment strategy']],
    ['Spacing system', 'uses consistent distance rules to create rhythm and grouping', ['adds random gaps to every screen', 'replaces content structure', 'is an encryption standard']],
  ],
  'user-research-methods': [
    ['User interview', 'gathers qualitative evidence by asking people about experiences, needs, and behavior', ['proves a hypothesis from one person', 'is a production deployment', 'is a database migration']],
    ['Usability test', 'observes representative users attempting realistic tasks with a product or prototype', ['asks only whether users like a color', 'requires a finished product', 'replaces all analytics']],
    ['Qualitative finding', 'captures themes, motivations, or observed behaviors in participants’ words or actions', ['is always a statistically representative percentage', 'is a database key', 'is a UI component']],
  ],
  'prototyping-wireframing': [
    ['Wireframe', 'is a simplified representation of layout, content, and interaction structure', ['is a production-ready visual design', 'is a database backup', 'is a server certificate']],
    ['Low-fidelity prototype', 'is a quick, inexpensive model used to explore structure and interaction early', ['must include final branding', 'cannot be changed after review', 'is a deployed application']],
    ['Clickable prototype', 'lets someone move through linked screens to test an interaction flow', ['only displays one static image', 'is a network security control', 'is a spreadsheet pivot']],
  ],
};

const root = process.cwd();
const skills = JSON.parse(readFileSync(join(root, 'data', 'skills.json'), 'utf8'));
const quizDir = join(root, 'data', 'quizzes');
mkdirSync(quizDir, { recursive: true });

function questionSet(id, concepts) {
  const questions = [];
  concepts.forEach(([term, definition, distractors], index) => {
    const options = [
      { id: 'a', text: definition },
      { id: 'b', text: distractors[0] },
      { id: 'c', text: distractors[1] },
      { id: 'd', text: distractors[2] },
    ];
    questions.push({
      id: `${id}-${index + 1}`,
      type: 'multiple_choice',
      prompt: `What best describes ${term}?`,
      options,
      correctOptionId: 'a',
      explanation: `${term} ${definition}.`,
      difficulty: index === 0 ? 'BEGINNER' : index === 1 ? 'INTERMEDIATE' : 'ADVANCED',
    });
  });

  const [term, definition] = concepts[0];
  questions.push({
    id: `${id}-4`,
    type: 'true_false',
    prompt: `True or false: ${term} ${definition}.`,
    correctAnswer: true,
    explanation: `${term} ${definition}.`,
    difficulty: 'BEGINNER',
  });

  const [answerTerm, answerDefinition] = concepts[2];
  questions.push({
    id: `${id}-5`,
    type: 'short_answer',
    prompt: `What term describes this idea: ${answerDefinition}?`,
    acceptedAnswers: [answerTerm],
    explanation: `The term is ${answerTerm}.`,
    difficulty: 'INTERMEDIATE',
  });

  return questions;
}

let created = 0;
for (const skill of skills) {
  if (skill.slug === 'javascript-fundamentals' || skill.slug === 'sql-fundamentals') continue;
  const concepts = banks[skill.slug];
  if (!concepts) throw new Error(`Missing quiz concepts for ${skill.slug}`);

  const quiz = {
    id: skill.slug,
    title: skill.name,
    skillSlug: skill.slug,
    description: `Test your understanding of ${skill.name.toLowerCase()}. ${skill.description}`,
    timeLimitSeconds: 600,
    questions: questionSet(skill.slug, concepts),
  };
  const target = join(quizDir, `${skill.slug}.json`);
  if (!existsSync(target)) {
    writeFileSync(target, `${JSON.stringify(quiz, null, 2)}\n`);
    created += 1;
  }
}

console.log(`Created ${created} skill quiz banks; existing authored banks were preserved.`);
