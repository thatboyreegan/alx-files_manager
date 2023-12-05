import { ObjectId } from 'mongodb';
import dbClient from './db';

class RequestBody {
  constructor(req) {
    const {
      name, type, parentId, isPublic, data,
    } = req.body;

    this.name = name;
    this.type = type;
    this.parentId = parentId || 0;
    this.isPublic = isPublic || false;
    this.data = data;

    this.acceptedTypes = ['folder', 'file', 'image'];
  }

  checkName() {
    return this.name;
  }

  checkType() {
    return this.type && this.acceptedTypes.includes(this.type);
  }

  checkData() {
    return this.data || this.type === 'folder';
  }

  async checkParentExists() {
    try {
      this.parent = await dbClient.files.findOne({
        _id: new ObjectId(`${this.parentId}`),
      });
    } catch (error) {
      console.log(error.toString());
      this.parent = null;
    }

    return this.parent;
  }

  async checkParentIsFolder() {
    this.parent = this.parent ? this.parent : await this.checkParentExists();

    return this.parent && this.parent.type === 'folder';
  }

  async checkAll() {
    if (!this.checkName()) return { error: 'Missing name' };
    if (!this.checkType()) return { error: 'Missing type' };
    if (!this.checkData()) return { error: 'Missing data' };

    if (this.parentId) {
      if (!(await this.checkParentExists())) return { error: 'Parent not found' };
      if (!(await this.checkParentIsFolder())) return { error: 'Parent is not a folder' };
    }

    return { success: 'ok' };
  }
}

export default RequestBody;
