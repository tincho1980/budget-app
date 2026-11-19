import { PageTitle } from '../components/PageTitle'
import { Empty } from '../components/states/Empty'

export function Projects() {
  return (
    <>
      <PageTitle>Mis proyectos</PageTitle>
      <Empty
        title="Todavía no hay proyectos"
        description="Cuando Adavra cargue un proyecto a tu nombre, lo vas a ver acá."
      />
    </>
  )
}
