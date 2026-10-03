import type { JSX } from 'react';
import type { EligibleProfessional } from '../../../interfaces/professional.interface';

type ProfessionalSelectorProps = {
  professionals: EligibleProfessional[];
  value: string;
  onChange: (professionalId: string) => void;
};

export default function ProfessionalSelector({
  professionals,
  value,
  onChange,
}: ProfessionalSelectorProps): JSX.Element {
  if (professionals.length === 0) {
    return <p role="status">Não há profissionais disponíveis para este serviço.</p>;
  }

  if (professionals.length === 1) {
    return <p aria-label="Profissional selecionado">Atendimento com {professionals[0]!.name}</p>;
  }

  return (
    <label className="field" htmlFor="professional">
      Profissional
      <select
        id="professional"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      >
        <option value="">Selecione um profissional</option>
        {professionals.map((professional) => (
          <option key={professional.id} value={professional.id}>
            {professional.name}
          </option>
        ))}
      </select>
    </label>
  );
}
