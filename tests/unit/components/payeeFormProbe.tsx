import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form } from "@/components/forms/Form";
import { PayeeAccountFields, payeeAccountCreate, payeeAccountSchema } from "@/features/master-data/components/PayeeAccountFields";

const schema = z.object(payeeAccountSchema);

/** A bare form around the accounts section, for tests. */
export function FormProbe({ onSubmit }: { onSubmit: (body: ReturnType<typeof payeeAccountCreate>) => void }) {
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { accounts: [] } });
  return (
    <Form form={form} onSubmit={(v) => onSubmit(payeeAccountCreate(v))} id="probe">
      <PayeeAccountFields />
      <button type="submit">Go</button>
    </Form>
  );
}
