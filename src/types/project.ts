// GET /api/project/projectList 응답
export interface Project {
  id: string
  projectName: string
  startDate: string      // "YYYY-MM-DD"
  completionDate: string // "YYYY-MM-DD"
}
