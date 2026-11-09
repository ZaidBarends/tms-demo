import { useParams } from 'react-router-dom'
import CatalogueList from './CatalogueList'
import CourseDetail from './CourseDetail'

export default function Catalogue() {
  const { courseId } = useParams()
  return courseId ? <CourseDetail id={courseId} /> : <CatalogueList />
}
