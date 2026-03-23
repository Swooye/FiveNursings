import { Edit, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, Select } from "antd";

export const AdminEdit = () => {
  const { formProps, saveButtonProps, queryResult } = useForm();

  const { selectProps: roleSelectProps } = useSelect({
    resource: "roles",
    optionLabel: "name",
    optionValue: "key",
  });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="Username"
          name={"username"}
          rules={[{ required: true, message: "Please input the username!" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Email"
          name={"email"}
          rules={[{ required: true, type: "email", message: "Please input a valid email!" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Nickname" name={"nickname"}>
          <Input />
        </Form.Item>
        <Form.Item
          label="Role"
          name={"role"}
          rules={[{ required: true, message: "Please select a role!" }]}
        >
          <Select {...roleSelectProps} />
        </Form.Item>
      </Form>
    </Edit>
  );
};
