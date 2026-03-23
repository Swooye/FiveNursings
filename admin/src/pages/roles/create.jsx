import { Create, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";

export const RoleCreate = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Name" name={"name"} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Key" name={"key"} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Form>
    </Create>
  );
};
