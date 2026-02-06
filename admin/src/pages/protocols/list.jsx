import React from "react";
import { List, useTable, EditButton } from "@refinedev/antd";
import { Table, Space } from "antd";

export const ProtocolList = () => {
    const { tableProps } = useTable();
    return (
        <List>
            <Table {...tableProps} rowKey="id">
                <Table.Column dataIndex="title" title="协议标题" />
                <Table.Column dataIndex="key" title="标识符" />
                <Table.Column dataIndex="updatedAt" title="最后更新" />
                <Table.Column 
                    title="操作"
                    render={(_, record) => (
                        <Space>
                            <EditButton hideText size="small" recordItemId={record.id} />
                        </Space>
                    )}
                />
            </Table>
        </List>
    );
};
